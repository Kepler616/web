;(function () {
  const GRID_COLS = 20;
  const GRID_ROWS = 20;
  const TILE_SIZE = 30;
  const INITIAL_SPEED = 6;
  const SPEED_STEP = 0.4;
  const BG_COLOR = 0x020617;
  const SNAKE_HEAD_COLOR = 0x22c55e;
  const SNAKE_BODY_COLOR = 0x15803d;
  const FOOD_COLOR = 0xf97316;
  const OVERLAY_COLOR = 0x000000;
  const OVERLAY_ALPHA = 0.45;

  class SnakeScene extends Phaser.Scene {
    constructor() {
      super("SnakeScene");
      this.snake = [];
      this.direction = { x: 1, y: 0 };
      this.pendingDirection = { x: 1, y: 0 };
      this.moveTimer = 0;
      this.moveInterval = 0;
      this.food = { x: 0, y: 0 };
      this.score = 0;
      this.highScore = 0;
      this.isStarted = false;
      this.isGameOver = false;
      this.isPaused = false;
      this.graphics = null;
      this.scoreText = null;
      this.highScoreText = null;
      this.overlay = null;
      this.overlayText = null;
      this.cursors = null;
      this.keys = {};
    }

    preload() {}

    create() {
      this.cameras.main.setBackgroundColor(BG_COLOR);

      this.graphics = this.add.graphics();

      this.scoreText = this.add.text(6, 6, "Score: 0", {
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        fontSize: "16px",
        color: "#e5e7eb",
      });
      this.highScoreText = this.add.text(6, 26, "Highest Score: 0", {
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        fontSize: "16px",
        color: "#e5e7eb",
      });

      this.overlay = this.add.rectangle(
        this.scale.width / 2,
        this.scale.height / 2,
        this.scale.width,
        this.scale.height,
        OVERLAY_COLOR,
        OVERLAY_ALPHA
      );
      this.overlay.setVisible(false);

      this.overlayText = this.add.text(this.scale.width / 2, this.scale.height / 2, "", {
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        fontSize: "20px",
        color: "#f9fafb",
        align: "center",
      });
      this.overlayText.setOrigin(0.5);
      this.overlayText.setVisible(false);

      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys.W = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
      this.keys.A = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      this.keys.S = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
      this.keys.D = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
      this.keys.R = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
      this.keys.P = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
      this.keys.SPACE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.keys.ENTER = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

      this.highScore = this.loadHighScore();
      this.updateHighScoreText();

      this.keys.R.on("down", () => {
        if (this.isGameOver) {
          this.scene.restart();
        }
      });

      this.keys.P.on("down", () => {
        if (this.isGameOver || !this.isStarted) {
          return;
        }
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
          this.showOverlay("Paused\nPress P to resume");
        } else {
          this.hideOverlay();
        }
      });

      this.keys.SPACE.on("down", () => {
        this.handleStartKey();
      });
      this.keys.ENTER.on("down", () => {
        this.handleStartKey();
      });

      this.initGame();
    }

    initGame() {
      this.snake = [
        { x: 5, y: 10 },
        { x: 4, y: 10 },
        { x: 3, y: 10 },
      ];
      this.direction = { x: 1, y: 0 };
      this.pendingDirection = { x: 1, y: 0 };
      this.moveTimer = 0;
      this.moveInterval = 1000 / INITIAL_SPEED;
      this.score = 0;
      this.isStarted = false;
      this.isGameOver = false;
      this.isPaused = false;
      this.updateScoreText();
      this.updateHighScoreText();
      this.spawnFood();
      this.redraw();
      this.showStartScreen();
    }

    update(time, delta) {
      if (this.isGameOver || this.isPaused || !this.isStarted) {
        return;
      }

      this.handleInput();

      this.moveTimer += delta;
      if (this.moveTimer >= this.moveInterval) {
        this.moveTimer -= this.moveInterval;
        this.stepSnake();
      }
    }

    handleStartKey() {
      if (this.isStarted || this.isGameOver) {
        return;
      }
      this.isStarted = true;
      this.hideOverlay();
    }

    handleInput() {
      let newDir = null;

      if (this.cursors.left.isDown || this.keys.A.isDown) {
        newDir = { x: -1, y: 0 };
      } else if (this.cursors.right.isDown || this.keys.D.isDown) {
        newDir = { x: 1, y: 0 };
      } else if (this.cursors.up.isDown || this.keys.W.isDown) {
        newDir = { x: 0, y: -1 };
      } else if (this.cursors.down.isDown || this.keys.S.isDown) {
        newDir = { x: 0, y: 1 };
      }

      if (!newDir) {
        return;
      }

      if (newDir.x === -this.direction.x && newDir.y === -this.direction.y) {
        return;
      }

      this.pendingDirection = newDir;
    }

    stepSnake() {
      this.direction = { x: this.pendingDirection.x, y: this.pendingDirection.y };

      const head = this.snake[0];
      const newHead = {
        x: head.x + this.direction.x,
        y: head.y + this.direction.y,
      };

      if (
        newHead.x < 0 ||
        newHead.x >= GRID_COLS ||
        newHead.y < 0 ||
        newHead.y >= GRID_ROWS
      ) {
        this.onGameOver();
        return;
      }

      if (this.isOnSnake(newHead.x, newHead.y)) {
        this.onGameOver();
        return;
      }

      this.snake.unshift(newHead);

      if (newHead.x === this.food.x && newHead.y === this.food.y) {
        this.score += 1;
        this.updateScoreText();
        this.adjustSpeed();
        this.spawnFood();
      } else {
        this.snake.pop();
      }

      this.redraw();
    }

    isOnSnake(x, y) {
      for (let i = 0; i < this.snake.length; i += 1) {
        const segment = this.snake[i];
        if (segment.x === x && segment.y === y) {
          return true;
        }
      }
      return false;
    }

    spawnFood() {
      let x;
      let y;

      do {
        x = Phaser.Math.Between(0, GRID_COLS - 1);
        y = Phaser.Math.Between(0, GRID_ROWS - 1);
      } while (this.isOnSnake(x, y));

      this.food.x = x;
      this.food.y = y;
    }

    updateScoreText() {
      if (this.scoreText) {
        this.scoreText.setText("Score: " + this.score);
      }
    }
    updateHighScoreText() {
      if (this.highScoreText) {
        this.highScoreText.setText("Highest Score: " + this.highScore);
      }
    }

    loadHighScore() {
      try {
        const raw = window.localStorage ? window.localStorage.getItem("snakeHighScore") : null;
        const parsed = raw ? parseInt(raw, 10) : 0;
        return Number.isNaN(parsed) ? 0 : parsed;
      } catch (e) {
        return 0;
      }
    }

    saveHighScore() {
      try {
        if (window.localStorage) {
          window.localStorage.setItem("snakeHighScore", String(this.highScore));
        }
      } catch (e) {}
    }

    updateHighScore() {
      if (this.score > this.highScore) {
        this.highScore = this.score;
        this.saveHighScore();
        this.updateHighScoreText();
      }
    }

    adjustSpeed() {
      const length = this.snake.length;
      const extra = Math.max(0, length - 3);
      const speed = INITIAL_SPEED + extra * SPEED_STEP;
      this.moveInterval = 1000 / speed;
    }

    redraw() {
      const w = GRID_COLS * TILE_SIZE;
      const h = GRID_ROWS * TILE_SIZE;

      this.graphics.clear();

      this.graphics.fillStyle(0x000000, 1);
      this.graphics.fillRect(0, 0, w, h);

      this.graphics.lineStyle(1, 0x1f2937, 1);
      this.graphics.strokeRect(0, 0, w, h);

      for (let i = this.snake.length - 1; i >= 0; i -= 1) {
        const segment = this.snake[i];
        const color = i === 0 ? SNAKE_HEAD_COLOR : SNAKE_BODY_COLOR;
        this.graphics.fillStyle(color, 1);
        this.graphics.fillRect(
          segment.x * TILE_SIZE,
          segment.y * TILE_SIZE,
          TILE_SIZE,
          TILE_SIZE
        );
      }

      this.graphics.fillStyle(FOOD_COLOR, 1);
      this.graphics.fillRect(
        this.food.x * TILE_SIZE,
        this.food.y * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE
      );
    }

    showStartScreen() {
      const text = "Start: Press Space or Enter\nHigh score: " + this.highScore;
      this.showOverlay(text);
    }

    showOverlay(message) {
      if (this.overlay) {
        this.overlay.setVisible(true);
      }
      if (this.overlayText) {
        this.overlayText.setText(message);
        this.overlayText.setVisible(true);
      }
    }

    hideOverlay() {
      if (this.overlay) {
        this.overlay.setVisible(false);
      }
      if (this.overlayText) {
        this.overlayText.setVisible(false);
      }
    }

    onGameOver() {
      this.isGameOver = true;
      this.updateHighScore();
      const message =
        "Game Over\nScore: " +
        this.score +
        "\nHigh score: " +
        this.highScore +
        "\nPress R to restart";
      this.showOverlay(message);
      if (window && typeof window.onSnakeGameOver === "function") {
        try {
          window.onSnakeGameOver(this.score);
        } catch (e) {}
      }
    }
  }

  const width = GRID_COLS * TILE_SIZE;
  const height = GRID_ROWS * TILE_SIZE;

  const config = {
    type: Phaser.CANVAS,
    width: width,
    height: height,
    backgroundColor: BG_COLOR,
    parent: "snake-game-container",
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.NONE,
      autoCenter: Phaser.Scale.NO_CENTER,
    },
    scene: SnakeScene,
  };

  new Phaser.Game(config);
})();
