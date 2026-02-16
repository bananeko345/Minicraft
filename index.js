<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Web Minecraft Clone</title>
    <style>
        body { margin: 0; overflow: hidden; background: #000; font-family: 'Courier New', Courier, monospace; }
        /* ホーム画面 */
        #menu { position: absolute; width: 100%; height: 100%; background: url('https://web.archive.org'); background-size: cover; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 100; color: white; text-shadow: 2px 2px #000; }
        input { padding: 10px; font-size: 18px; margin: 10px; width: 250px; border: 2px solid #fff; background: rgba(0,0,0,0.5); color: white; }
        button { padding: 10px 20px; font-size: 18px; cursor: pointer; background: #555; color: white; border: 2px solid #fff; margin: 5px; width: 274px; }
        button:hover { background: #888; }

        /* HUD (ゲーム内UI) */
        #hud { display: none; pointer-events: none; position: absolute; width: 100%; height: 100%; color: white; }
        #coords { position: absolute; top: 10px; right: 10px; font-size: 14px; }
        #chat-box { position: absolute; top: 10px; left: 10px; width: 300px; height: 150px; background: rgba(0,0,0,0.3); padding: 5px; font-size: 12px; }
        #crosshair { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 20px; }
        
        /* ホットバー */
        #hotbar { position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); display: flex; gap: 4px; pointer-events: auto; background: rgba(0,0,0,0.5); padding: 4px; border: 2px solid #333; }
        .slot { width: 40px; height: 40px; border: 2px solid #888; display: flex; align-items: center; justify-content: center; font-weight: bold; background: #444; }
        .slot.active { border-color: #fff; background: #666; }
        .slot.inv-btn { background: #d4af37; cursor: pointer; }

        /* タブレット用ジョイスティック */
        #joystick { position: absolute; bottom: 40px; left: 40px; width: 120px; height: 120px; background: rgba(255,255,255,0.2); border-radius: 50%; display: none; pointer-events: auto; }
    </style>
</head>
<body>

    <div id="menu">
        <h1>WEB MINECRAFT</h1>
        <input type="text" id="playerName" placeholder="名前を入力...">
        <button onclick="bootGame('pc')">PCでプレイ (WASD)</button>
        <button onclick="bootGame('tablet')">タブレットでプレイ</button>
    </div>

    <div id="hud">
        <div id="coords">XYZ: 0, 0, 0</div>
        <div id="chat-box"><b>[System]</b> ワールドに参加しました。</div>
        <div id="crosshair">+</div>
        <div id="hotbar">
            <div class="slot active" onclick="setSlot(0)">1</div>
            <div class="slot" onclick="setSlot(1)">2</div>
            <div class="slot" onclick="setSlot(2)">3</div>
            <div class="slot" onclick="setSlot(3)">4</div>
            <div class="slot" onclick="setSlot(4)">5</div>
            <div class="slot" onclick="setSlot(5)">6</div>
            <div class="slot" onclick="setSlot(6)">7</div>
            <div class="slot" onclick="setSlot(7)">8</div>
            <div class="slot inv-btn" onclick="toggleInventory()">E</div>
        </div>
        <div id="joystick"></div>
    </div>

    <script type="importmap">
        { "imports": { "three": "https://unpkg.com", "controls": "https://unpkg.com" } }
    </script>

    <script type="module">
        import * as THREE from 'three';
        import { PointerLockControls } from 'controls';

        let scene, camera, renderer, controls, playerDevice;
        let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
        let velocity = new THREE.Vector3();
        let direction = new THREE.Vector3();

        window.bootGame = function(device) {
            const name = document.getElementById('playerName').value || "Steve";
            playerDevice = device;
            document.getElementById('menu').style.display = 'none';
            document.getElementById('hud').style.display = 'block';
            if(device === 'tablet') document.getElementById('joystick').style.display = 'block';
            
            init();
            animate();
        }

        function init() {
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x87ceeb); // 昼の空
            scene.fog = new THREE.FogExp2(0x87ceeb, 0.02);

            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.y = 2;

            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            document.body.appendChild(renderer.domElement);

            // 光源 (太陽)
            const sun = new THREE.DirectionalLight(0xffffff, 1);
            sun.position.set(50, 100, 50);
            scene.add(sun);
            scene.add(new THREE.AmbientLight(0x404040, 0.6));

            // 地形生成 (簡易版: 草、砂漠、海)
            const geo = new THREE.BoxGeometry(1, 1, 1);
            for(let x = -20; x < 20; x++) {
                for(let z = -20; z < 20; z++) {
                    let color = 0x3e9b1c; // 草
                    let y = 0;
                    if(Math.abs(x) > 15 || Math.abs(z) > 15) { color = 0x1e90ff; y = -0.5; } // 海
                    else if(x > 10) { color = 0xedc9af; } // 砂漠

                    const mat = new THREE.MeshLambertMaterial({ color: color });
                    const mesh = new THREE.Mesh(geo, mat);
                    mesh.position.set(x, y, z);
                    scene.add(mesh);
                }
            }

            // PC操作設定
            if(playerDevice === 'pc') {
                controls = new PointerLockControls(camera, document.body);
                document.body.addEventListener('click', () => controls.lock());
                const onKeyDown = (e) => {
                    switch(e.code) {
                        case 'KeyW': moveForward = true; break;
                        case 'KeyS': moveBackward = true; break;
                        case 'KeyA': moveLeft = true; break;
                        case 'KeyD': moveRight = true; break;
                        case 'KeyE': toggleInventory(); break;
                        case 'Digit1': case 'Digit2': case 'Digit3': setSlot(parseInt(e.key)-1); break;
                    }
                };
                const onKeyUp = (e) => {
                    switch(e.code) {
                        case 'KeyW': moveForward = false; break;
                        case 'KeyS': moveBackward = false; break;
                        case 'KeyA': moveLeft = false; break;
                        case 'KeyD': moveRight = false; break;
                    }
                };
                document.addEventListener('keydown', onKeyDown);
                document.addEventListener('keyup', onKeyUp);
            }
        }

        function animate() {
            requestAnimationFrame(animate);
            const time = performance.now();

            if (controls && controls.isLocked) {
                const delta = 0.15; // 移動速度
                velocity.x -= velocity.x * 10.0 * delta;
                velocity.z -= velocity.z * 10.0 * delta;

                direction.z = Number(moveForward) - Number(moveBackward);
                direction.x = Number(moveRight) - Number(moveLeft);
                direction.normalize();

                if (moveForward || moveBackward) velocity.z -= direction.z * 400.0 * delta;
                if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * delta;

                controls.moveRight(-velocity.x * delta);
                controls.moveForward(-velocity.z * delta);
                
                // 座標更新
                document.getElementById('coords').innerText = `XYZ: ${Math.round(camera.position.x)}, ${Math.round(camera.position.y)}, ${Math.round(camera.position.z)}`;
            }

            // 簡易 昼夜サイクル
            const dayTime = time * 0.0001;
            scene.background.setHSL(0.6, 1, 0.5 + Math.sin(dayTime) * 0.3);

            renderer.render(scene, camera);
        }

        window.setSlot = function(n) {
            document.querySelectorAll('.slot').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.slot').classList.add('active');
        }

        window.toggleInventory = function() {
            alert("インベントリ画面 (HTML/CSSで作成予定)");
        }

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    </script>
</body>
</html>
