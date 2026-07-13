/**
 * DOM Elements Selection
 */
const currentOperandText = document.getElementById('currentOperand');
const previousOperandText = document.getElementById('previousOperand');
const keypad = document.getElementById('keypad');
const copyBtn = document.getElementById('copyBtn');
const toggleHistoryBtn = document.getElementById('toggleHistoryBtn');
const historyPanel = document.getElementById('historyPanel');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

/**
 * State Management Variables
 */
let currentExpression = '';
let isEvaluated = false;
let history = [];

/**
 * --- MATH PARSER & EVALUATOR (NO EVAL) ---
 * Safe evaluation using Tokenizer + Shunting Yard + Stack Evaluator
 */

// 1. Tokenize the input string (e.g., "-5+3×2" -> ["-5", "+", "3", "×", "2"])
function tokenize(expr) {
    const tokens = [];
    let numberBuffer = '';

    // Standardize the visual operators to mathematical ones for parsing
    let standardizedExpr = expr.replace(/×/g, '*').replace(/÷/g, '/');

    for (let i = 0; i < standardizedExpr.length; i++) {
        let char = standardizedExpr[i];

        if (/[0-9.]/.test(char)) {
            numberBuffer += char; // Build numbers including decimals
        } else {
            if (numberBuffer) {
                tokens.push(numberBuffer);
                numberBuffer = '';
            }
            
            // Handle negative numbers (unary minus)
            // If '-' is the first character OR immediately follows another operator or '('
            if (char === '-' && (tokens.length === 0 || /[+\-*/(]/.test(tokens[tokens.length - 1]))) {
                numberBuffer += '-';
            } else {
                tokens.push(char); // Push operators or parentheses
            }
        }
    }
    if (numberBuffer) tokens.push(numberBuffer);
    return tokens;
}

// 2. Shunting Yard Algorithm (Infix to Postfix/RPN)
function shuntingYard(tokens) {
    const output = [];
    const operators = [];
    const precedence = { '+': 1, '-': 1, '*': 2, '/': 2 };

    for (let token of tokens) {
        if (!isNaN(parseFloat(token))) {
            output.push(parseFloat(token)); // If number, add to output
        } else if (token === '(') {
            operators.push(token);
        } else if (token === ')') {
            while (operators.length && operators[operators.length - 1] !== '(') {
                output.push(operators.pop());
            }
            operators.pop(); // Remove '('
        } else if (precedence[token]) {
            while (
                operators.length && 
                operators[operators.length - 1] !== '(' &&
                precedence[operators[operators.length - 1]] >= precedence[token]
            ) {
                output.push(operators.pop());
            }
            operators.push(token);
        }
    }

    while (operators.length) {
        output.push(operators.pop());
    }
    return output;
}

// 3. Evaluate the RPN/Postfix Expression
function evaluateRPN(rpnTokens) {
    const stack = [];
    for (let token of rpnTokens) {
        if (typeof token === 'number') {
            stack.push(token);
        } else {
            const b = stack.pop();
            const a = stack.pop();
            
            if (a === undefined || b === undefined) throw new Error("Invalid Expression");

            switch (token) {
                case '+': stack.push(a + b); break;
                case '-': stack.push(a - b); break;
                case '*': stack.push(a * b); break;
                case '/': 
                    if (b === 0) throw new Error("Divide by Zero");
                    stack.push(a / b); 
                    break;
            }
        }
    }
    return stack[0];
}

// Wrapper function that uses the above 3 steps safely
function calculateMath(expression) {
    try {
        const tokens = tokenize(expression);
        const rpn = shuntingYard(tokens);
        const result = evaluateRPN(rpn);
        
        // Handle floating point errors (e.g., 0.1 + 0.2 = 0.30000000000000004)
        return Math.round(result * 10000000000) / 10000000000;
    } catch (error) {
        return "Error";
    }
}

/**
 * --- UI AND DOM UPDATES ---
 */

// Dynamically adjust font size to prevent overflow
function adjustFontSize() {
    let fontSize = 48; // Base size matching CSS
    currentOperandText.style.fontSize = `${fontSize}px`;
    
    // Scale down if text is wider than container
    while (currentOperandText.scrollWidth > currentOperandText.clientWidth && fontSize > 20) {
        fontSize -= 2;
        currentOperandText.style.fontSize = `${fontSize}px`;
    }
}

// Format numbers elegantly (add commas, handle scientific notation)
function formatDisplayNumber(numString) {
    if (numString === "Error" || numString === "NaN") return numString;
    
    // Split on operators to only format the numbers, not the whole expression
    const parts = numString.split(/([+\-×÷()])/);
    
    const formattedParts = parts.map(part => {
        if (/[+\-×÷()]/.test(part) || part === "") return part; // Return operators as is
        
        let num = parseFloat(part);
        if (isNaN(num)) return part;

        // Use Scientific Notation for extreme sizes
        if (num > 1e12 || num < -1e12) return num.toExponential(4);

        // Format with commas, respecting user's typed decimal points
        const stringParts = part.split('.');
        stringParts[0] = parseInt(stringParts[0]).toLocaleString('en-US');
        return stringParts.join('.');
    });

    return formattedParts.join('');
}

function updateDisplay() {
    currentOperandText.innerText = formatDisplayNumber(currentExpression) || '0';
    adjustFontSize();
    
    // Auto scroll to the right
    currentOperandText.scrollLeft = currentOperandText.scrollWidth;
}

/**
 * --- CORE CALCULATOR LOGIC ---
 */

function appendValue(val) {
    if (isEvaluated) {
        // If typing a number right after an evaluation, start fresh
        if (/[0-9.]/.test(val)) {
            currentExpression = val;
        } else {
            // If typing an operator, continue from previous result
            currentExpression += val;
        }
        isEvaluated = false;
        previousOperandText.innerText = '';
    } else {
        // Prevent multiple decimals in a single number token
        if (val === '.') {
            const tokens = currentExpression.split(/[+\-×÷()]/);
            const currentToken = tokens[tokens.length - 1];
            if (currentToken.includes('.')) return;
        }
        
        // Prevent stacking visual operators
        if (/[+\-×÷]/.test(val)) {
            const lastChar = currentExpression.slice(-1);
            if (/[+\-×÷.]/.test(lastChar)) {
                currentExpression = currentExpression.slice(0, -1) + val;
                updateDisplay();
                return;
            }
        }
        
        currentExpression += val;
    }
    updateDisplay();
}

function deleteLast() {
    if (isEvaluated) {
        previousOperandText.innerText = '';
        isEvaluated = false;
    }
    currentExpression = currentExpression.toString().slice(0, -1);
    updateDisplay();
}

function clearAll() {
    currentExpression = '';
    previousOperandText.innerText = '';
    isEvaluated = false;
    updateDisplay();
}

function toggleSign() {
    if (!currentExpression) return;
    
    // Find the last number typed to toggle its sign
    const match = currentExpression.match(/(-\d+\.?\d*|\d+\.?\d*)$/);
    if (match) {
        let lastNumber = match[0];
        let toggled = lastNumber.startsWith('-') ? lastNumber.substring(1) : '-' + lastNumber;
        currentExpression = currentExpression.slice(0, -lastNumber.length) + toggled;
        updateDisplay();
    }
}

function percentage() {
    if (!currentExpression || /[+\-×÷(]$/.test(currentExpression)) return;
    try {
        // Find the last number token and divide it by 100
        const tokens = currentExpression.split(/([+\-×÷()])/);
        const lastIndex = tokens.length - 1;
        let lastNum = parseFloat(tokens[lastIndex]);
        
        if (!isNaN(lastNum)) {
            tokens[lastIndex] = (lastNum / 100).toString();
            currentExpression = tokens.join('');
            updateDisplay();
        }
    } catch (e) {
        // Ignore silent fails on malformed ends
    }
}

function evaluate() {
    if (!currentExpression) return;

    // Remove hanging operators at the end
    if (/[+\-×÷.]$/.test(currentExpression)) {
        currentExpression = currentExpression.slice(0, -1);
    }

    const result = calculateMath(currentExpression);
    
    // Save to history before updating UI
    if (result !== "Error" && currentExpression !== result.toString()) {
        addToHistory(currentExpression, result);
    }

    previousOperandText.innerText = formatDisplayNumber(currentExpression) + ' =';
    currentExpression = result.toString();
    isEvaluated = true;
    updateDisplay();
}

/**
 * --- HISTORY SYSTEM ---
 */

function addToHistory(expr, res) {
    history.unshift({ expression: expr, result: res });
    if (history.length > 20) history.pop(); // Keep last 20 limits
    renderHistory();
}

function renderHistory() {
    historyList.innerHTML = '';
    history.forEach(item => {
        const li = document.createElement('li');
        li.classList.add('history-item');
        li.innerHTML = `
            <div class="hist-expr">${formatDisplayNumber(item.expression)} =</div>
            <div class="hist-result">${formatDisplayNumber(item.result.toString())}</div>
        `;
        li.addEventListener('click', () => {
            currentExpression = item.result.toString();
            previousOperandText.innerText = `Retrieved: ${formatDisplayNumber(item.expression)}`;
            isEvaluated = true;
            updateDisplay();
        });
        historyList.appendChild(li);
    });
}

/**
 * --- EVENT LISTENERS ---
 */

// Event Delegation for Keypad clicks
keypad.addEventListener('click', (e) => {
    if (!e.target.matches('button')) return;

    const btn = e.target;
    const action = btn.dataset.action;
    const value = btn.dataset.value;

    if (value) {
        appendValue(value);
    } else if (action) {
        switch(action) {
            case 'clear': clearAll(); break;
            case 'delete': deleteLast(); break;
            case 'percent': percentage(); break;
            case 'toggle-sign': toggleSign(); break;
            case 'calculate': evaluate(); break;
        }
    }
    
    // Optional: add a tiny visual feedback vibration for mobile
    if (navigator.vibrate) navigator.vibrate(50);
});

// Keyboard Support
window.addEventListener('keydown', (e) => {
    const key = e.key;

    if (/[0-9.]/.test(key)) {
        e.preventDefault();
        appendValue(key);
    } else if (key === '+' || key === '-') {
        e.preventDefault();
        appendValue(key);
    } else if (key === '*') {
        e.preventDefault();
        appendValue('×');
    } else if (key === '/') {
        e.preventDefault();
        appendValue('÷');
    } else if (key === '(' || key === ')') {
        e.preventDefault();
        appendValue(key);
    } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        evaluate();
    } else if (key === 'Backspace') {
        e.preventDefault();
        deleteLast();
    } else if (key === 'Escape') {
        e.preventDefault();
        clearAll();
    } else if (key === '%') {
        e.preventDefault();
        percentage();
    }
});

// Copy Result to Clipboard
copyBtn.addEventListener('click', () => {
    if (!currentExpression || currentExpression === 'Error') return;
    navigator.clipboard.writeText(currentExpression).then(() => {
        // Visual feedback
        const oldIcon = copyBtn.innerText;
        copyBtn.innerText = '✔️';
        copyBtn.style.color = '#00e5ff';
        setTimeout(() => {
            copyBtn.innerText = oldIcon;
            copyBtn.style.color = 'var(--display-secondary)';
        }, 1500);
    });
});

// Toggle History Panel
toggleHistoryBtn.addEventListener('click', () => {
    historyPanel.classList.toggle('active');
});

// Clear History
clearHistoryBtn.addEventListener('click', () => {
    history = [];
    renderHistory();
});