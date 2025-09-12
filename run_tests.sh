#!/bin/bash

echo "🧪 Running Discord Soundboard Test Suite"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
PYTHON_TESTS_PASSED=0
BACKEND_TESTS_PASSED=0
FRONTEND_TESTS_PASSED=0

# Function to run tests and capture results
run_test_suite() {
    local test_name="$1"
    local test_command="$2"
    local test_dir="$3"
    
    echo -e "\n${BLUE}🔄 Running $test_name...${NC}"
    echo "----------------------------------------"
    
    if [ -n "$test_dir" ]; then
        cd "$test_dir" || exit 1
    fi
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ $test_name PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name FAILED${NC}"
        return 1
    fi
}

# Start from project root
cd "$(dirname "$0")" || exit 1
PROJECT_ROOT=$(pwd)

echo "📂 Project root: $PROJECT_ROOT"

# 1. Run Python tests (Discord Bot)
echo -e "\n${YELLOW}=== Python Tests (Discord Bot) ===${NC}"
if run_test_suite "Python Bot Tests" "uv run pytest tests/test_bot.py -v" "$PROJECT_ROOT"; then
    PYTHON_TESTS_PASSED=1
fi

# 2. Install backend dependencies if not already installed
echo -e "\n${YELLOW}=== Backend Dependencies ===${NC}"
cd "$PROJECT_ROOT/backend" || exit 1
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi

# 3. Run backend tests
echo -e "\n${YELLOW}=== Backend Tests (API & Socket.io) ===${NC}"
if run_test_suite "Backend API Tests" "npm test" "$PROJECT_ROOT/backend"; then
    BACKEND_TESTS_PASSED=1
fi

# 4. Install frontend dependencies if not already installed
echo -e "\n${YELLOW}=== Frontend Dependencies ===${NC}"
cd "$PROJECT_ROOT/frontend" || exit 1
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# 5. Run frontend tests
echo -e "\n${YELLOW}=== Frontend Tests (React Components) ===${NC}"
if run_test_suite "Frontend Component Tests" "npm test -- --coverage --watchAll=false" "$PROJECT_ROOT/frontend"; then
    FRONTEND_TESTS_PASSED=1
fi

# 6. Run integration tests (optional, requires more setup)
echo -e "\n${YELLOW}=== Integration Tests ===${NC}"
cd "$PROJECT_ROOT" || exit 1
echo "⚠️  Integration tests require backend server to be running"
echo "💡 To run integration tests manually:"
echo "   1. Start backend: cd backend && npm run dev"
echo "   2. Run tests: uv run pytest tests/integration/ -v -m 'not slow'"

# 7. Run linting and formatting checks
echo -e "\n${YELLOW}=== Code Quality Checks ===${NC}"

# Python formatting check
echo "🔍 Checking Python code formatting..."
cd "$PROJECT_ROOT" || exit 1
if command -v black >/dev/null 2>&1; then
    if uv run black --check bot/ tests/; then
        echo -e "${GREEN}✅ Python formatting OK${NC}"
    else
        echo -e "${YELLOW}⚠️  Python formatting issues found (run 'uv run black bot/ tests/' to fix)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Black not available for Python formatting check${NC}"
fi

# JavaScript/React formatting check (if prettier is available)
cd "$PROJECT_ROOT/backend" || exit 1
if npm list prettier >/dev/null 2>&1; then
    if npx prettier --check .; then
        echo -e "${GREEN}✅ Backend formatting OK${NC}"
    else
        echo -e "${YELLOW}⚠️  Backend formatting issues found${NC}"
    fi
fi

cd "$PROJECT_ROOT/frontend" || exit 1
if npm list prettier >/dev/null 2>&1; then
    if npx prettier --check src/; then
        echo -e "${GREEN}✅ Frontend formatting OK${NC}"
    else
        echo -e "${YELLOW}⚠️  Frontend formatting issues found${NC}"
    fi
fi

# Final summary
echo -e "\n${BLUE}========================================"
echo -e "📊 TEST SUITE SUMMARY"
echo -e "========================================${NC}"

echo -e "Python Bot Tests:     $([ $PYTHON_TESTS_PASSED -eq 1 ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}")"
echo -e "Backend API Tests:    $([ $BACKEND_TESTS_PASSED -eq 1 ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}")"
echo -e "Frontend Tests:       $([ $FRONTEND_TESTS_PASSED -eq 1 ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}")"

TOTAL_PASSED=$((PYTHON_TESTS_PASSED + BACKEND_TESTS_PASSED + FRONTEND_TESTS_PASSED))

if [ $TOTAL_PASSED -eq 3 ]; then
    echo -e "\n${GREEN}🎉 ALL TESTS PASSED! ($TOTAL_PASSED/3)${NC}"
    echo -e "Your Discord Soundboard is ready for development!"
    exit 0
else
    echo -e "\n${RED}❌ SOME TESTS FAILED ($TOTAL_PASSED/3 passed)${NC}"
    echo -e "Please check the failed tests above."
    exit 1
fi