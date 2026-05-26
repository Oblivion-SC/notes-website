<?php
require_once 'db.php';

$data = json_decode(file_get_contents('php://input'), true);
$email = trim($data['email'] ?? '');
$password = $data['password'] ?? '';

if (!$email || !$password) {
    http_response_code(400);
    echo json_encode(['error' => 'Введите email и пароль']);
    exit();
}

$stmt = $pdo->prepare('SELECT id, email, password_hash, avatar FROM users WHERE email = ?');
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Неверный email или пароль']);
    exit();
}

$token = bin2hex(random_bytes(32));
$stmt = $pdo->prepare('UPDATE users SET session_token = ? WHERE id = ?');
$stmt->execute([$token, $user['id']]);

echo json_encode([
    'success' => true,
    'token' => $token,
    'user' => [
        'id' => $user['id'],
        'email' => $user['email'],
        'avatar' => $user['avatar']
    ]
]);
?>