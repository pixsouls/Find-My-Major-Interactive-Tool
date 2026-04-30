import os
import random
import re
from pathlib import Path

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException
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
TOTAL_QUESTIONS = 48
CHECKPOINT_EVERY = 12


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


def expected_final_top_type_label(scores):
    leading_type = TYPE_ORDER[0]
    leading_score = scores[leading_type]
    for trait in TYPE_ORDER[1:]:
        if scores[trait] > leading_score:
            leading_type = trait
            leading_score = scores[trait]
    return TYPE_LABELS[leading_type]


def open_quiz(driver, wait):
    driver.get(BASE_URL)

    quick_wait = WebDriverWait(driver, 1)
    try:
        start_button = quick_wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[normalize-space()='Start Quiz']")
            )
        )
        start_button.click()
        wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, ".question-text")))
        return
    except TimeoutException:
        pass

    wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, ".question-text")))


def test_random_answers_match_final_result_after_all_48_questions(driver):
    runs = int(os.getenv("RANDOM_RUNS", "10"))
    seed = os.getenv("RANDOM_SEED")
    rng = random.Random(int(seed)) if seed is not None else random.Random()
    wait = WebDriverWait(driver, WAIT_SECONDS)
    answer_labels = list(ANSWER_SCORE_DELTAS.keys())

    for run_index in range(runs):
        open_quiz(driver, wait)

        scores = {trait: 0 for trait in TYPE_ORDER}

        for question_index in range(TOTAL_QUESTIONS):
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

            if (question_index + 1) % CHECKPOINT_EVERY == 0:
                checkpoint_title = wait.until(
                    EC.visibility_of_element_located((By.CSS_SELECTOR, "#checkpoint-title"))
                )
                checkpoint_label = normalize_text(checkpoint_title.text)

                if question_index + 1 < TOTAL_QUESTIONS:
                    assert checkpoint_label == "Progress Report", (
                        f"Run {run_index + 1}: expected checkpoint title 'Progress Report' "
                        f"at question {question_index + 1}, got {checkpoint_label!r}"
                    )
                    click_option_by_text(driver, wait, "CONTINUE QUIZ")
                else:
                    assert checkpoint_label == "Assessment Complete", (
                        f"Run {run_index + 1}: expected final checkpoint title "
                        f"'Assessment Complete', got {checkpoint_label!r}"
                    )
                    click_option_by_text(driver, wait, "VIEW FULL RESULTS")

        primary_trait = wait.until(
            EC.visibility_of_element_located((By.CSS_SELECTOR, ".holland-reveal-card .primary"))
        )
        actual_label = normalize_text(primary_trait.text).split(" (")[0].lower()
        expected_label = expected_final_top_type_label(scores).lower()

        assert (
            actual_label == expected_label
        ), f"Run {run_index + 1}/{runs}: expected {expected_label}, got {actual_label}"
