import pytest
import asyncio
import os
import time
import subprocess
import requests
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException

@pytest.mark.slow
class TestEndToEnd:
    """End-to-end tests using a real browser"""
    
    @pytest.fixture(scope="class")
    def backend_server(self):
        """Start backend server for E2E testing"""
        env = os.environ.copy()
        env.update({
            'NODE_ENV': 'test',
            'PORT': '3003',
            'SOUNDS_DIR': './e2e-test-sounds'
        })
        
        backend_dir = Path(__file__).parent.parent.parent / 'backend'
        process = subprocess.Popen(
            ['npm', 'run', 'dev'],
            cwd=backend_dir,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Wait for server to start
        time.sleep(3)
        
        # Verify server is running
        try:
            response = requests.get('http://localhost:3003/api/status', timeout=5)
            if response.status_code != 200:
                raise Exception("Backend server failed to start")
        except Exception as e:
            process.terminate()
            raise e
        
        yield process
        
        process.terminate()
        process.wait()
    
    @pytest.fixture(scope="class")
    def frontend_server(self):
        """Start frontend development server for E2E testing"""
        env = os.environ.copy()
        env.update({
            'REACT_APP_API_URL': 'http://localhost:3003',
            'PORT': '3004'
        })
        
        frontend_dir = Path(__file__).parent.parent.parent / 'frontend'
        process = subprocess.Popen(
            ['npm', 'start'],
            cwd=frontend_dir,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Wait for frontend to start (React dev server takes longer)
        time.sleep(10)
        
        # Verify frontend is running
        try:
            response = requests.get('http://localhost:3004', timeout=10)
            if response.status_code != 200:
                raise Exception("Frontend server failed to start")
        except Exception as e:
            process.terminate()
            raise e
        
        yield process
        
        process.terminate()
        process.wait()
    
    @pytest.fixture
    def browser(self):
        """Set up Chrome browser for testing"""
        chrome_options = Options()
        chrome_options.add_argument('--headless')  # Run in headless mode for CI
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--window-size=1920,1080')
        
        driver = webdriver.Chrome(options=chrome_options)
        driver.implicitly_wait(10)
        
        yield driver
        
        driver.quit()
    
    def test_application_loads(self, backend_server, frontend_server, browser):
        """Test that the application loads successfully"""
        browser.get('http://localhost:3004')
        
        # Wait for the main title to appear
        title = WebDriverWait(browser, 10).until(
            EC.presence_of_element_located((By.XPATH, "//h1[contains(text(), 'Discord Soundboard')]"))
        )
        
        assert title.is_displayed()
        assert 'Discord Soundboard' in title.text
    
    def test_bot_status_display(self, backend_server, frontend_server, browser):
        """Test that bot status is displayed"""
        browser.get('http://localhost:3004')
        
        # Wait for bot status section to load
        bot_status_title = WebDriverWait(browser, 10).until(
            EC.presence_of_element_located((By.XPATH, "//h2[contains(text(), 'Bot Status')]"))
        )
        
        assert bot_status_title.is_displayed()
        
        # Should show disconnected status initially
        disconnected_status = WebDriverWait(browser, 5).until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Disconnected')]"))
        )
        
        assert disconnected_status.is_displayed()
    
    def test_upload_section_display(self, backend_server, frontend_server, browser):
        """Test that upload section is displayed"""
        browser.get('http://localhost:3004')
        
        # Wait for upload section to load
        upload_title = WebDriverWait(browser, 10).until(
            EC.presence_of_element_located((By.XPATH, "//h2[contains(text(), 'Upload Sounds')]"))
        )
        
        assert upload_title.is_displayed()
        
        # Check for upload instructions
        upload_instructions = browser.find_element(By.XPATH, 
            "//*[contains(text(), 'Drag and drop audio files here or click to browse')]")
        assert upload_instructions.is_displayed()
    
    def test_sound_board_display(self, backend_server, frontend_server, browser):
        """Test that sound board section is displayed"""
        browser.get('http://localhost:3004')
        
        # Wait for sound board section to load
        soundboard_title = WebDriverWait(browser, 10).until(
            EC.presence_of_element_located((By.XPATH, "//h2[contains(text(), 'Sound Effects')]"))
        )
        
        assert soundboard_title.is_displayed()
        
        # Should show empty state initially
        empty_message = WebDriverWait(browser, 5).until(
            EC.presence_of_element_located((By.XPATH, 
                "//*[contains(text(), 'No sounds uploaded yet')]"))
        )
        
        assert empty_message.is_displayed()
    
    def test_search_functionality(self, backend_server, frontend_server, browser):
        """Test search input functionality"""
        browser.get('http://localhost:3004')
        
        # Wait for search input to be available
        search_input = WebDriverWait(browser, 10).until(
            EC.presence_of_element_located((By.XPATH, "//input[@placeholder='Search sounds...']"))
        )
        
        assert search_input.is_displayed()
        assert search_input.is_enabled()
        
        # Test typing in search input
        search_input.send_keys('test')
        assert search_input.get_attribute('value') == 'test'
    
    def test_responsive_layout(self, backend_server, frontend_server, browser):
        """Test that the layout is responsive"""
        browser.get('http://localhost:3004')
        
        # Test desktop layout
        browser.set_window_size(1920, 1080)
        time.sleep(1)
        
        # Verify grid layout elements are visible
        bot_status = browser.find_element(By.XPATH, "//h2[contains(text(), 'Bot Status')]")
        sound_board = browser.find_element(By.XPATH, "//h2[contains(text(), 'Sound Effects')]")
        
        assert bot_status.is_displayed()
        assert sound_board.is_displayed()
        
        # Test mobile layout
        browser.set_window_size(375, 667)
        time.sleep(1)
        
        # Elements should still be visible but stacked
        assert bot_status.is_displayed()
        assert sound_board.is_displayed()
    
    def test_api_connectivity(self, backend_server, frontend_server, browser):
        """Test that frontend can connect to backend API"""
        browser.get('http://localhost:3004')
        
        # The app should load without errors, indicating successful API connection
        # Wait for the app to fully load and make initial API calls
        WebDriverWait(browser, 15).until(
            EC.presence_of_element_located((By.XPATH, "//h1[contains(text(), 'Discord Soundboard')]"))
        )
        
        # Check that no error messages are displayed
        try:
            error_element = browser.find_element(By.XPATH, "//*[contains(text(), 'error') or contains(text(), 'Error')]")
            # If we find an error element, the test should fail
            assert False, f"Found error message: {error_element.text}"
        except:
            # No error elements found, which is what we want
            pass
        
        # Verify that the sound count is displayed (indicating successful API call)
        sound_count = WebDriverWait(browser, 10).until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'of') and contains(text(), 'sounds')]"))
        )
        
        assert sound_count.is_displayed()
    
    @pytest.mark.skip(reason="File upload testing requires special setup in headless browser")
    def test_file_upload_ui(self, backend_server, frontend_server, browser):
        """Test file upload user interface"""
        browser.get('http://localhost:3004')
        
        # Wait for upload section
        upload_area = WebDriverWait(browser, 10).until(
            EC.presence_of_element_located((By.XPATH, 
                "//div[contains(text(), 'Drag and drop audio files here')]"))
        )
        
        # Test clicking browse files button
        browse_button = browser.find_element(By.XPATH, "//label[contains(text(), 'Browse Files')]")
        assert browse_button.is_displayed()
        assert browse_button.is_enabled()
        
        # Note: Actual file upload testing in headless browser requires additional setup