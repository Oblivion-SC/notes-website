<?php
require_once 'db.php';
require_once 'auth_check.php';

$userId = getUserId($pdo);
if (!$userId) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->prepare('SELECT avatar FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $avatar = $stmt->fetchColumn();
    echo json_encode(['avatar' => $avatar]);
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $avatarData = $data['avatar'] ?? null;
    if (!$avatarData) {
        http_response_code(400);
        echo json_encode(['error' => 'Нет данных аватара']);
        exit();
    }
    $stmt = $pdo->prepare('UPDATE users SET avatar = ? WHERE id = ?');
    $stmt->execute([$avatarData, $userId]);
    echo json_encode(['success' => true]);
} elseif ($method === 'DELETE') {
    $stmt = $pdo->prepare('UPDATE users SET avatar = NULL WHERE id = ?');
    $stmt->execute([$userId]);
    echo json_encode(['success' => true]);
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
?>