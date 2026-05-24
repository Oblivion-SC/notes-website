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

    function showMessage(text, type) {
        authMessage.textContent = text;
        authMessage.className = `auth-message ${type}`;
    }

    authForm.addEventListener("submit", (e) => {
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
        authBtn.textContent = "Вход...";
        authMessage.textContent = "";

        setTimeout(() => {
            try {
                if (isLogin) {
                    const users = JSON.parse(localStorage.getItem("users")) || [];
                    const user = users.find(u => u.email === email);
                    if (user && user.password === password) {
                        localStorage.setItem("isAuth", "true");
                        localStorage.setItem("currentUserEmail", email);
                        // СОХРАНЯЕМ ОБЪЕКТ ПОЛЬЗОВАТЕЛЯ ДЛЯ ОТОБРАЖЕНИЯ В ПРОФИЛЕ
                        localStorage.setItem("user", JSON.stringify({ email: email }));
                        showMessage("Успешный вход!", "success");
                        setTimeout(() => window.location.href = "html_main.html", 800);
                    } else {
                        showMessage("Неверный email или пароль", "error");
                    }
                } else {
                    const users = JSON.parse(localStorage.getItem("users")) || [];
                    if (users.some(u => u.email === email)) {
                        showMessage("Email уже занят", "error");
                    } else {
                        users.push({ email, password });
                        localStorage.setItem("users", JSON.stringify(users));
                        showMessage("Аккаунт создан!", "success");
                        // После регистрации переключаем на форму входа, пользователь заходит сам
                        setTimeout(() => switchMode(true), 1500);
                    }
                }
            } catch (err) {
                showMessage("Произошла ошибка", "error");
            } finally {
                authBtn.disabled = false;
                authBtn.textContent = isLogin ? "Войти" : "Зарегистрироваться";
            }
        }, 600);
    });

    emailInput.focus();
});