// auth.js – регистрация и вход через серверное API
const API_BASE = '/api';

document.addEventListener("DOMContentLoaded", () => {
    const authForm = document.getElementById("authForm");
    const authBtn = document.getElementById("authBtn");
    const emailInput = document.getElementById("emailInput");
    const passwordInput = document.getElementById("passwordInput");
    const confirmPasswordInput = document.getElementById("confirmPasswordInput");
    const confirmPasswordGroup = document.getElementById("confirmPasswordGroup");
    const authMessage = document.getElementById("authMessage");
    const switchText = document.getElementById("switchText");
    const switchBtn = document.getElementById("switchBtn");

    let isLogin = true;

    function showMessage(text, type) {
        authMessage.textContent = text;
        authMessage.className = `auth-message ${type}`;
    }

    function clearForm() {
        authForm.reset();
        authMessage.textContent = "";
        authMessage.className = "auth-message";
        emailInput.focus();
    }

    function switchMode(login) {
        isLogin = login;
        if (login) {
            switchText.textContent = "Новый пользователь?";
            switchBtn.textContent = "Создать аккаунт";
            confirmPasswordGroup.classList.add("hidden");
            authBtn.textContent = "Войти";
            confirmPasswordInput.required = false;
        } else {
            switchText.textContent = "Уже есть аккаунт?";
            switchBtn.textContent = "Войти";
            confirmPasswordGroup.classList.remove("hidden");
            authBtn.textContent = "Зарегистрироваться";
            confirmPasswordInput.required = true;
        }
        clearForm();
    }

    switchBtn.addEventListener("click", (e) => {
        e.preventDefault();
        switchMode(!isLogin);
    });

    // Регистрация
    async function register(email, password) {
        const response = await fetch(`${API_BASE}/register.php`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Ошибка регистрации");
        return data;
    }

    // Вход
    async function login(email, password) {
        const response = await fetch(`${API_BASE}/login.php`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Ошибка входа");
        // Сохраняем токен и данные пользователя (без пароля)
        localStorage.setItem("session_token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        return data;
    }

    authForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showMessage("Введите корректный email", "error");
            return;
        }
        if (password.length < 6) {
            showMessage("Пароль минимум 6 символов", "error");
            return;
        }
        if (!isLogin && password !== confirmPassword) {
            showMessage("Пароли не совпадают", "error");
            return;
        }

        authBtn.disabled = true;
        authBtn.textContent = isLogin ? "Вход..." : "Регистрация...";
        authMessage.textContent = "";

        try {
            if (isLogin) {
                await login(email, password);
                showMessage("Успешный вход!", "success");
                setTimeout(() => window.location.href = "html_main.html", 800);
            } else {
                await register(email, password);
                showMessage("Аккаунт создан! Теперь войдите.", "success");
                setTimeout(() => switchMode(true), 1500);
            }
        } catch (err) {
            showMessage(err.message, "error");
        } finally {
            authBtn.disabled = false;
            authBtn.textContent = isLogin ? "Войти" : "Зарегистрироваться";
        }
    });

    emailInput.focus();
});