import os

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

BASE_URL = os.getenv("FRONTEND_URL", "http://127.0.0.1:5173")
WAIT_SECONDS = int(os.getenv("SELENIUM_WAIT_SECONDS", "10"))


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


def set_random_sequence(driver, sequence):
    # Make randomized question selection deterministic for stable UI assertions.
    driver.execute_script(
        """
        window.__testRandomSeq = arguments[0].slice();
        if (!window.__originalMathRandom) {
          window.__originalMathRandom = Math.random;
        }
        Math.random = function () {
          if (window.__testRandomSeq && window.__testRandomSeq.length > 0) {
            return window.__testRandomSeq.shift();
          }
          return 0.001;
        };
        """,
        sequence,
    )


def complete_12_questions_and_assert_type(
    driver, answer_label: str, expected_type: str, random_sequence=None
):
    wait = WebDriverWait(driver, WAIT_SECONDS)

    driver.get(BASE_URL)
    wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, ".question-text")))

    if random_sequence is not None:
        set_random_sequence(driver, random_sequence)

    for _ in range(12):
        click_option_by_text(driver, wait, answer_label)

    wait.until(
        EC.visibility_of_element_located(
            (By.XPATH, "//h2[normalize-space()='Progress Report']")
        )
    )
    leading_badge = wait.until(
        EC.visibility_of_element_located((By.CSS_SELECTOR, ".leading-badge"))
    )

    assert leading_badge.text.strip().lower() == expected_type.lower()


def test_checkpoint_type_after_12_strongly_agree_answers(driver):
    complete_12_questions_and_assert_type(driver, "Strongly Agree", "Conventional")


def test_checkpoint_type_after_12_agree_answers(driver):
    complete_12_questions_and_assert_type(driver, "Agree", "Conventional")


def test_checkpoint_type_after_12_neutral_answers(driver):
    complete_12_questions_and_assert_type(driver, "Neutral", "Conventional")


def test_checkpoint_type_after_12_disagree_answers(driver):
    disagree_random_sequence = [
        0.001,
        0.001,
        0.001,
        0.001,
        0.001,
        0.001,
        0.001,
        0.04,
        0.04,
        0.04,
        0.04,
    ]
    complete_12_questions_and_assert_type(
        driver,
        "Disagree",
        "Social",
        random_sequence=disagree_random_sequence,
    )


def test_checkpoint_type_after_12_strongly_disagree_answers(driver):
    strongly_disagree_random_sequence = [
        0.001,
        0.001,
        0.001,
        0.001,
        0.001,
        0.001,
        0.001,
        0.001,
        0.04,
        0.04,
        0.04,
    ]
    complete_12_questions_and_assert_type(
        driver,
        "Strongly Disagree",
        "Enterprising",
        random_sequence=strongly_disagree_random_sequence,
    )
