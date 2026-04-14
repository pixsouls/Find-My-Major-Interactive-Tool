import os
import random
import re
from pathlib import Path

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

BASE_URL = os.getenv("FRONTEND_URL", "http://127.0.0.1:5173")
WAIT_SECONDS = int(os.getenv("SELENIUM_WAIT_SECONDS", "10"))
TYPE_LABELS = {
    "R": "Realistic",
    "I": "Investigative",
    "A": "Artistic",
    "S": "Social",
    "E": "Enterprising",
    "C": "Conventional",
}
ANSWER_SCORE_DELTAS = {
    "Strongly Disagree": -2,
    "Disagree": -1,
    "Neutral": 0,
    "Agree": 1,
    "Strongly Agree": 2,
}
TYPE_ORDER = ["R", "I", "A", "S", "E", "C"]


def normalize_text(value: str) -> str:
    return value.strip().replace("\u2019", "'")


def load_question_type_map():
    types_path = (
        Path(__file__).resolve().parent.parent / "Frontend" / "src" / "data" / "types.ts"
    )
    content = types_path.read_text(encoding="utf-8")
    pattern = re.compile(r'\{ id:\s*\d+,\s*text:\s*"([^"]+)",\s*type:\s*"([RIASEC])" \}')
    matches = pattern.findall(content)
    if not matches:
        raise RuntimeError(f"Could not parse question/type definitions from {types_path}")
    return {normalize_text(question_text): riasec_type for question_text, riasec_type in matches}


QUESTION_TYPE_BY_TEXT = load_question_type_map()


@pytest.fixture
def driver():
    options = Options()

    options.add_argument("--window-size=1400,1000")
    options.add_argument("--disable-gpu")

    browser = webdriver.Chrome(options=options)
    yield browser
    browser.quit()


def click_option_by_text(driver, wait, label: str):
    button = wait.until(
        EC.element_to_be_clickable(
            (By.XPATH, f"//button[normalize-space()='{label}']")
        )
    )
    button.click()


def expected_top_type_label(scores):
    leading_type = TYPE_ORDER[0]
    leading_score = scores[leading_type]
    for trait in TYPE_ORDER[1:]:
        if scores[trait] >= leading_score:
            leading_type = trait
            leading_score = scores[trait]
    return TYPE_LABELS[leading_type]

def test_random_answers_match_checkpoint_result(driver):
    runs = int(os.getenv("RANDOM_RUNS", "10"))
    seed = os.getenv("RANDOM_SEED")
    rng = random.Random(int(seed)) if seed is not None else random.Random()
    wait = WebDriverWait(driver, WAIT_SECONDS)
    answer_labels = list(ANSWER_SCORE_DELTAS.keys())

    for run_index in range(runs):
        driver.get(BASE_URL)
        wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, ".question-text")))

        scores = {trait: 0 for trait in TYPE_ORDER}

        for _ in range(12):
            question_text = normalize_text(
                wait.until(
                    EC.visibility_of_element_located((By.CSS_SELECTOR, ".question-text"))
                ).text
            )
            assert (
                question_text in QUESTION_TYPE_BY_TEXT
            ), f"Unknown question text in run {run_index + 1}: {question_text!r}"
            current_type = QUESTION_TYPE_BY_TEXT[question_text]

            chosen_label = rng.choice(answer_labels)
            scores[current_type] += ANSWER_SCORE_DELTAS[chosen_label]
            click_option_by_text(driver, wait, chosen_label)

        wait.until(
            EC.visibility_of_element_located(
                (By.XPATH, "//h2[normalize-space()='Progress Report']")
            )
        )
        leading_badge = wait.until(
            EC.visibility_of_element_located((By.CSS_SELECTOR, ".leading-badge"))
        )
        actual_label = normalize_text(leading_badge.text).lower()
        expected_label = expected_top_type_label(scores).lower()

        assert (
            actual_label == expected_label
        ), f"Run {run_index + 1}/{runs}: expected {expected_label}, got {actual_label}"
