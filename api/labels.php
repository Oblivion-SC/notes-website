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
$labelId = isset($_GET['id']) ? (int)$_GET['id'] : null;

switch ($method) {
    case 'GET':
        $stmt = $pdo->prepare('SELECT id, name FROM labels WHERE user_id = ? ORDER BY name');
        $stmt->execute([$userId]);
        echo json_encode($stmt->fetchAll());
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        $name = trim($data['name'] ?? '');
        if (strlen($name) < 1 || strlen($name) > 50) {
            http_response_code(400);
            echo json_encode(['error' => 'Название ярлыка от 1 до 50 символов']);
            exit();
        }
        $check = $pdo->prepare('SELECT id FROM labels WHERE user_id = ? AND name = ?');
        $check->execute([$userId, $name]);
        if ($check->fetch()) {
            http_response_code(409);
            echo json_encode(['error' => 'Такой ярлык уже существует']);
            exit();
        }
        $stmt = $pdo->prepare('INSERT INTO labels (user_id, name) VALUES (?, ?)');
        $stmt->execute([$userId, $name]);
        echo json_encode(['id' => $pdo->lastInsertId(), 'name' => $name]);
        break;

    case 'DELETE':
        if (!$labelId) {
            http_response_code(400);
            echo json_encode(['error' => 'ID ярлыка не указан']);
            exit();
        }
        $stmt = $pdo->prepare('DELETE FROM labels WHERE id = ? AND user_id = ?');
        $stmt->execute([$labelId, $userId]);
        echo json_encode(['success' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}
?>