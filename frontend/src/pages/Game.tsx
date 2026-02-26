import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Trophy, Play, Heart, Coins, Smartphone } from 'lucide-react';
import { useHighScores, useSubmitScore } from '../hooks/useQueries';

type GameState = 'menu' | 'playing' | 'gameOver';

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityY: number;
  isJumping: boolean;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Coin {
  x: number;
  y: number;
  width: number;
  height: number;
  collected: boolean;
}

interface Particle {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  life: number;
  maxLife: number;
  color: string;
}

const GRAVITY = 0.6;
const JUMP_STRENGTH = -12;
const INITIAL_SPEED = 4;
const SPEED_INCREMENT = 0.0005;
const GROUND_HEIGHT = 100;
const PLAYER_START_X = 100;
const ANIMATION_FRAME_DURATION = 8;

// Enhanced scaling factors for significantly larger game elements
const SCALE_FACTOR = 2.5; // Increased from implicit 1.0 to 2.5x
const PLAYER_BASE_WIDTH = 64;
const PLAYER_BASE_HEIGHT = 64;
const PLAYER_WIDTH = PLAYER_BASE_WIDTH * SCALE_FACTOR;
const PLAYER_HEIGHT = PLAYER_BASE_HEIGHT * SCALE_FACTOR;

const CACTUS_BASE_WIDTH = 32;
const CACTUS_BASE_HEIGHT = 48;
const CACTUS_WIDTH = CACTUS_BASE_WIDTH * SCALE_FACTOR;
const CACTUS_HEIGHT = CACTUS_BASE_HEIGHT * SCALE_FACTOR;

const COIN_BASE_SIZE = 32;
const COIN_SIZE = COIN_BASE_SIZE * SCALE_FACTOR;

// Ground alignment offsets scaled proportionally
const PLAYER_GROUND_OFFSET = 8 * SCALE_FACTOR;
const CACTUS_GROUND_OFFSET = 0;

function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const gameStateRef = useRef<GameState>('menu');
  const playerRef = useRef<Player>({
    x: PLAYER_START_X,
    y: 0,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    velocityY: 0,
    isJumping: false,
  });
  const obstaclesRef = useRef<Obstacle[]>([]);
  const coinsRef = useRef<Coin[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const scoreRef = useRef<number>(0);
  const coinsCollectedRef = useRef<number>(0);
  const gameSpeedRef = useRef<number>(INITIAL_SPEED);
  const frameCountRef = useRef<number>(0);
  const backgroundOffsetRef = useRef<number>(0);
  const animationFrameCountRef = useRef<number>(0);
  const currentSpriteIndexRef = useRef<number>(0);
  
  const playerIdleRightRef = useRef<HTMLImageElement | null>(null);
  const playerRunSprite1RightRef = useRef<HTMLImageElement | null>(null);
  const playerRunSprite2RightRef = useRef<HTMLImageElement | null>(null);
  const cactusImageRef = useRef<HTMLImageElement | null>(null);
  const coinImageRef = useRef<HTMLImageElement | null>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const groundImageRef = useRef<HTMLImageElement | null>(null);
  const coinSoundRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const coinSoundLoadedRef = useRef<boolean>(false);
  const lastCoinSoundTimeRef = useRef<number>(0);

  const [gameState, setGameState] = useState<GameState>('menu');
  const [score, setScore] = useState<number>(0);
  const [coinsCollected, setCoinsCollected] = useState<number>(0);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(true);
  const [showOrientationWarning, setShowOrientationWarning] = useState(false);

  const { data: highScores } = useHighScores();
  const submitScoreMutation = useSubmitScore();

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                     (window.innerWidth <= 768);
      setIsMobile(mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Monitor orientation changes
  useEffect(() => {
    const checkOrientation = () => {
      const landscape = window.innerWidth > window.innerHeight;
      setIsLandscape(landscape);
      
      // Show warning on mobile in portrait mode
      if (isMobile && !landscape && gameState === 'playing') {
        setShowOrientationWarning(true);
      } else {
        setShowOrientationWarning(false);
      }
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, [isMobile, gameState]);

  // Load images and audio
  useEffect(() => {
    const playerIdleRight = new Image();
    playerIdleRight.src = '/assets/generated/player-character-right-transparent.dim_64x64.png';
    playerIdleRightRef.current = playerIdleRight;

    const playerRunImg1Right = new Image();
    playerRunImg1Right.src = '/assets/generated/player-character-run1-right-transparent.dim_64x64.png';
    playerRunSprite1RightRef.current = playerRunImg1Right;

    const playerRunImg2Right = new Image();
    playerRunImg2Right.src = '/assets/generated/player-character-run2-right-transparent.dim_64x64.png';
    playerRunSprite2RightRef.current = playerRunImg2Right;

    const cactusImg = new Image();
    cactusImg.src = '/assets/generated/cactus-pixel-obstacle-transparent.dim_32x48.png';
    cactusImageRef.current = cactusImg;

    const coinImg = new Image();
    coinImg.src = '/assets/generated/icp-coin-transparent.dim_32x32.png';
    coinImageRef.current = coinImg;

    const bgImg = new Image();
    bgImg.src = '/assets/generated/desert-background.dim_1024x400.png';
    backgroundImageRef.current = bgImg;

    const groundImg = new Image();
    groundImg.src = '/assets/generated/desert-ground.dim_1024x100.png';
    groundImageRef.current = groundImg;

    // Load coin sound with error handling
    const coinSound = new Audio();
    coinSound.preload = 'auto';
    coinSound.volume = 0.4;
    
    coinSound.addEventListener('canplaythrough', () => {
      coinSoundLoadedRef.current = true;
    });
    
    coinSound.addEventListener('error', () => {
      console.log('Coin sound file not found, will use procedural sound');
      coinSoundLoadedRef.current = false;
    });
    
    coinSound.src = '/assets/generated/coin-pickup.wav';
    coinSoundRef.current = coinSound;

    // Initialize Web Audio API context for fallback procedural sound
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioContextRef.current = new AudioContextClass();
      }
    } catch (e) {
      console.log('Web Audio API not supported');
    }
  }, []);

  // Setup canvas with pixel-perfect rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    // @ts-ignore
    ctx.mozImageSmoothingEnabled = false;
    // @ts-ignore
    ctx.webkitImageSmoothingEnabled = false;
    // @ts-ignore
    ctx.msImageSmoothingEnabled = false;
  }, []);

  // Procedural coin sound generator using Web Audio API
  const playProceduralCoinSound = useCallback(() => {
    const audioContext = audioContextRef.current;
    if (!audioContext) return;

    try {
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const now = audioContext.currentTime;
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(988, now);
      oscillator.frequency.exponentialRampToValueAtTime(1319, now + 0.1);
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start(now);
      oscillator.stop(now + 0.15);
    } catch (error) {
      console.log('Error playing procedural sound:', error);
    }
  }, []);

  const playCoinSound = useCallback(() => {
    const currentTime = Date.now();
    const timeSinceLastSound = currentTime - lastCoinSoundTimeRef.current;
    
    if (timeSinceLastSound < 50) {
      return;
    }
    
    lastCoinSoundTimeRef.current = currentTime;

    const sound = coinSoundRef.current;
    if (sound && coinSoundLoadedRef.current) {
      try {
        const soundClone = sound.cloneNode() as HTMLAudioElement;
        soundClone.volume = 0.4;
        
        const playPromise = soundClone.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.log('Audio playback prevented, trying procedural sound:', error);
            playProceduralCoinSound();
          });
        }
      } catch (error) {
        console.log('Error playing coin sound, using procedural fallback:', error);
        playProceduralCoinSound();
      }
    } else {
      playProceduralCoinSound();
    }
  }, [playProceduralCoinSound]);

  const enterFullscreen = useCallback(async () => {
    const container = gameContainerRef.current;
    if (!container) return;

    try {
      if (container.requestFullscreen) {
        await container.requestFullscreen();
      } else if ((container as any).webkitRequestFullscreen) {
        await (container as any).webkitRequestFullscreen();
      } else if ((container as any).mozRequestFullScreen) {
        await (container as any).mozRequestFullScreen();
      } else if ((container as any).msRequestFullscreen) {
        await (container as any).msRequestFullscreen();
      }
      setIsFullscreen(true);
      
      if (isMobile && screen.orientation) {
        try {
          // @ts-ignore
          if (typeof screen.orientation.lock === 'function') {
            // @ts-ignore
            await screen.orientation.lock('landscape').catch(() => {});
          }
        } catch (e) {}
      }
    } catch (error) {
      console.log('Fullscreen request failed:', error);
    }
  }, [isMobile]);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
      setIsFullscreen(false);
      
      if (isMobile && screen.orientation) {
        try {
          // @ts-ignore
          if (typeof screen.orientation.unlock === 'function') {
            // @ts-ignore
            screen.orientation.unlock();
          }
        } catch (e) {}
      }
    } catch (error) {
      console.log('Exit fullscreen failed:', error);
    }
  }, [isMobile]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const jump = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;
    
    const player = playerRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const groundY = canvas.height - GROUND_HEIGHT - player.height + PLAYER_GROUND_OFFSET;
    
    if (!player.isJumping && Math.abs(player.y - groundY) < 2) {
      player.velocityY = JUMP_STRENGTH;
      player.isJumping = true;
    }
  }, []);

  const checkCollision = useCallback((player: Player, obstacle: Obstacle): boolean => {
    // Scaled hitbox adjustments
    const hitboxPadding = 8 * SCALE_FACTOR;
    const playerHitbox = {
      x: player.x + hitboxPadding,
      y: player.y + hitboxPadding,
      width: player.width - hitboxPadding * 2,
      height: player.height - hitboxPadding * 2 - PLAYER_GROUND_OFFSET,
    };

    const obstacleHitboxPadding = 4 * SCALE_FACTOR;
    const obstacleHitbox = {
      x: obstacle.x + obstacleHitboxPadding,
      y: obstacle.y + obstacleHitboxPadding,
      width: obstacle.width - obstacleHitboxPadding * 2,
      height: obstacle.height - obstacleHitboxPadding * 2,
    };

    return (
      playerHitbox.x < obstacleHitbox.x + obstacleHitbox.width &&
      playerHitbox.x + playerHitbox.width > obstacleHitbox.x &&
      playerHitbox.y < obstacleHitbox.y + obstacleHitbox.height &&
      playerHitbox.y + playerHitbox.height > obstacleHitbox.y
    );
  }, []);

  const checkCoinCollision = useCallback((player: Player, coin: Coin): boolean => {
    // Scaled coin collision detection
    const hitboxPadding = 12 * SCALE_FACTOR;
    const playerHitbox = {
      x: player.x + hitboxPadding,
      y: player.y + hitboxPadding,
      width: player.width - hitboxPadding * 2,
      height: player.height - hitboxPadding * 2 - PLAYER_GROUND_OFFSET,
    };

    const coinHitboxPadding = 4 * SCALE_FACTOR;
    const coinHitbox = {
      x: coin.x + coinHitboxPadding,
      y: coin.y + coinHitboxPadding,
      width: coin.width - coinHitboxPadding * 2,
      height: coin.height - coinHitboxPadding * 2,
    };

    return (
      playerHitbox.x < coinHitbox.x + coinHitbox.width &&
      playerHitbox.x + playerHitbox.width > coinHitbox.x &&
      playerHitbox.y < coinHitbox.y + coinHitbox.height &&
      playerHitbox.y + playerHitbox.height > coinHitbox.y
    );
  }, []);

  const createParticles = useCallback((x: number, y: number) => {
    const particles = particlesRef.current;
    const colors = ['#FFD700', '#FFA500', '#FFFF00', '#FF8C00'];
    
    // Scaled particle effects
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const speed = (2 + Math.random() * 2) * SCALE_FACTOR;
      particles.push({
        x,
        y,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed - 2 * SCALE_FACTOR,
        life: 30,
        maxLife: 30,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }, []);

  const spawnObstacle = useCallback((canvas: HTMLCanvasElement) => {
    const obstacles = obstaclesRef.current;
    
    // Adjusted spawn distance for larger obstacles
    if (obstacles.length === 0 || obstacles[obstacles.length - 1].x < canvas.width - 400) {
      obstacles.push({
        x: canvas.width,
        y: canvas.height - GROUND_HEIGHT - CACTUS_HEIGHT + CACTUS_GROUND_OFFSET,
        width: CACTUS_WIDTH,
        height: CACTUS_HEIGHT,
      });
    }
  }, []);

  const spawnCoin = useCallback((canvas: HTMLCanvasElement) => {
    const coins = coinsRef.current;
    
    // Adjusted spawn distance for larger coins
    if (coins.length === 0 || coins[coins.length - 1].x < canvas.width - 250) {
      const groundY = canvas.height - GROUND_HEIGHT;
      // Scaled coin height positions
      const yPositions = [
        groundY - COIN_SIZE - 10 * SCALE_FACTOR,
        groundY - COIN_SIZE - 80 * SCALE_FACTOR,
        groundY - COIN_SIZE - 150 * SCALE_FACTOR,
      ];
      
      coins.push({
        x: canvas.width,
        y: yPositions[Math.floor(Math.random() * yPositions.length)],
        width: COIN_SIZE,
        height: COIN_SIZE,
        collected: false,
      });
    }
  }, []);

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    if (gameStateRef.current !== 'playing') return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    backgroundOffsetRef.current -= gameSpeedRef.current * 0.3;

    const bgImg = backgroundImageRef.current;
    const skyHeight = canvas.height - GROUND_HEIGHT;
    
    if (bgImg?.complete) {
      const bgWidth = bgImg.width;
      const bgHeight = bgImg.height;
      const scale = skyHeight / bgHeight;
      const scaledWidth = bgWidth * scale;
      
      const offset = backgroundOffsetRef.current % scaledWidth;
      
      ctx.drawImage(bgImg, offset, 0, scaledWidth, skyHeight);
      ctx.drawImage(bgImg, offset + scaledWidth, 0, scaledWidth, skyHeight);
      
      if (offset + scaledWidth * 2 < canvas.width) {
        ctx.drawImage(bgImg, offset + scaledWidth * 2, 0, scaledWidth, skyHeight);
      }
    } else {
      const skyGradient = ctx.createLinearGradient(0, 0, 0, skyHeight);
      skyGradient.addColorStop(0, '#F5E6D3');
      skyGradient.addColorStop(0.5, '#FFE4B5');
      skyGradient.addColorStop(1, '#FFDAB9');
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, canvas.width, skyHeight);
    }

    const groundImg = groundImageRef.current;
    const groundY = canvas.height - GROUND_HEIGHT;
    
    if (groundImg?.complete) {
      const groundWidth = groundImg.width;
      const groundHeight = groundImg.height;
      const scale = GROUND_HEIGHT / groundHeight;
      const scaledWidth = groundWidth * scale;
      
      const groundOffset = (backgroundOffsetRef.current * 2) % scaledWidth;
      
      for (let x = groundOffset; x < canvas.width; x += scaledWidth) {
        ctx.drawImage(groundImg, x, groundY, scaledWidth, GROUND_HEIGHT);
      }
    } else {
      ctx.fillStyle = '#8B6F47';
      ctx.fillRect(0, groundY, canvas.width, GROUND_HEIGHT);
      
      ctx.fillStyle = '#6B5345';
      for (let i = 0; i < canvas.width; i += 40) {
        ctx.fillRect(i, groundY, 20, 10);
      }
    }

    const player = playerRef.current;
    const groundPlayerY = canvas.height - GROUND_HEIGHT - player.height + PLAYER_GROUND_OFFSET;

    player.velocityY += GRAVITY;
    player.y += player.velocityY;

    if (player.y >= groundPlayerY) {
      player.y = groundPlayerY;
      player.velocityY = 0;
      player.isJumping = false;
    }

    animationFrameCountRef.current++;
    if (animationFrameCountRef.current >= ANIMATION_FRAME_DURATION) {
      animationFrameCountRef.current = 0;
      currentSpriteIndexRef.current = (currentSpriteIndexRef.current + 1) % 2;
    }

    const playerRunSprites = [playerRunSprite1RightRef.current, playerRunSprite2RightRef.current];
    const currentSprite = playerRunSprites[currentSpriteIndexRef.current];

    // Draw scaled player with nearest-neighbor rendering
    if (currentSprite?.complete) {
      ctx.drawImage(currentSprite, player.x, player.y, player.width, player.height);
    } else {
      ctx.fillStyle = '#D2691E';
      ctx.fillRect(player.x, player.y, player.width, player.height);
    }

    frameCountRef.current++;
    if (frameCountRef.current % 120 === 0) {
      spawnObstacle(canvas);
    }
    if (frameCountRef.current % 90 === 0) {
      spawnCoin(canvas);
    }

    const coins = coinsRef.current;
    for (let i = coins.length - 1; i >= 0; i--) {
      const coin = coins[i];
      
      if (!coin.collected) {
        coin.x -= gameSpeedRef.current;

        // Draw scaled coin with nearest-neighbor rendering
        if (coinImageRef.current?.complete) {
          ctx.drawImage(coinImageRef.current, coin.x, coin.y, coin.width, coin.height);
        } else {
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.arc(coin.x + coin.width / 2, coin.y + coin.height / 2, coin.width / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        if (checkCoinCollision(player, coin)) {
          coin.collected = true;
          coinsCollectedRef.current += 1;
          setCoinsCollected(coinsCollectedRef.current);
          createParticles(coin.x + coin.width / 2, coin.y + coin.height / 2);
          playCoinSound();
        }
      }

      if (coin.x + coin.width < 0) {
        coins.splice(i, 1);
      }
    }

    const obstacles = obstaclesRef.current;
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obstacle = obstacles[i];
      obstacle.x -= gameSpeedRef.current;

      // Draw scaled cactus with nearest-neighbor rendering
      if (cactusImageRef.current?.complete) {
        ctx.drawImage(cactusImageRef.current, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
      } else {
        ctx.fillStyle = '#2D5016';
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
      }

      if (checkCollision(player, obstacle)) {
        gameStateRef.current = 'gameOver';
        setGameState('gameOver');
        setShowNameDialog(true);
        if (isFullscreen) {
          exitFullscreen();
        }
        return;
      }

      if (obstacle.x + obstacle.width < 0) {
        obstacles.splice(i, 1);
      }
    }

    const particles = particlesRef.current;
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];
      
      particle.x += particle.velocityX;
      particle.y += particle.velocityY;
      particle.velocityY += 0.2;
      particle.life -= 1;

      if (particle.life > 0) {
        const alpha = particle.life / particle.maxLife;
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        // Scaled particle size
        ctx.arc(particle.x, particle.y, 3 * SCALE_FACTOR, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        particles.splice(i, 1);
      }
    }

    scoreRef.current += 1;
    setScore(scoreRef.current);

    gameSpeedRef.current += SPEED_INCREMENT;

    // Responsive font size based on canvas width
    const fontSize = Math.max(16, Math.min(24, canvas.width / 40));
    ctx.fillStyle = '#5C4033';
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'right';
    ctx.strokeStyle = '#F5DEB3';
    ctx.lineWidth = 3;
    
    const displayScore = Math.floor(scoreRef.current / 10) + (coinsCollectedRef.current * 10);
    ctx.strokeText(`Punkte: ${displayScore}`, canvas.width - 20, 40);
    ctx.fillText(`Punkte: ${displayScore}`, canvas.width - 20, 40);

    ctx.textAlign = 'left';
    ctx.strokeText(`🪙 ${coinsCollectedRef.current}`, 20, 40);
    ctx.fillText(`🪙 ${coinsCollectedRef.current}`, 20, 40);

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [checkCollision, checkCoinCollision, createParticles, spawnObstacle, spawnCoin, playCoinSound, isFullscreen, exitFullscreen]);

  const startGame = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    await enterFullscreen();

    const audioContext = audioContextRef.current;
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }

    gameStateRef.current = 'playing';
    setGameState('playing');
    scoreRef.current = 0;
    setScore(0);
    coinsCollectedRef.current = 0;
    setCoinsCollected(0);
    gameSpeedRef.current = INITIAL_SPEED;
    frameCountRef.current = 0;
    obstaclesRef.current = [];
    coinsRef.current = [];
    particlesRef.current = [];
    backgroundOffsetRef.current = 0;
    animationFrameCountRef.current = 0;
    currentSpriteIndexRef.current = 0;
    lastCoinSoundTimeRef.current = 0;

    const player = playerRef.current;
    player.x = PLAYER_START_X;
    player.y = canvas.height - GROUND_HEIGHT - player.height + PLAYER_GROUND_OFFSET;
    player.velocityY = 0;
    player.isJumping = false;

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    gameLoop();
  }, [gameLoop, enterFullscreen]);

  const handleSubmitScore = useCallback(() => {
    if (playerName.trim()) {
      const finalScore = Math.floor(scoreRef.current / 10) + (coinsCollectedRef.current * 10);
      submitScoreMutation.mutate({
        playerName: playerName.trim(),
        score: finalScore,
      });
      setShowNameDialog(false);
      setPlayerName('');
    }
  }, [playerName, submitScoreMutation]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (gameStateRef.current === 'menu') {
          startGame();
        } else {
          jump();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [jump, startGame]);

  // Mouse/Touch controls
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleClick = () => {
      if (gameStateRef.current === 'playing') {
        jump();
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (gameStateRef.current === 'playing') {
        jump();
      }
    };

    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });

    return () => {
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('touchstart', handleTouchStart);
    };
  }, [jump]);

  // Cleanup animation frame
  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Responsive canvas sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          // @ts-ignore
          ctx.mozImageSmoothingEnabled = false;
          // @ts-ignore
          ctx.webkitImageSmoothingEnabled = false;
          // @ts-ignore
          ctx.msImageSmoothingEnabled = false;
        }
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const topScores = highScores
    ?.sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 5) || [];

  const finalScore = Math.floor(score / 10) + (coinsCollected * 10);

  return (
    <div className="min-h-screen bg-gradient-to-br from-desert-light via-desert-sand to-desert-warm">
      <header className="border-b-2 border-desert-accent/30 bg-gradient-to-r from-desert-card/98 to-desert-sand/98 backdrop-blur-md shadow-soft-lg">
        <div className="container mx-auto px-4 py-4 md:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-4">
              <div className="relative flex h-10 w-10 md:h-14 md:w-14 items-center justify-center rounded-xl bg-gradient-to-br from-desert-sun via-desert-accent to-desert-ground shadow-soft-lg transition-all duration-300 hover:scale-110 hover:shadow-soft-xl animate-pulse-glow">
                <Play className="h-5 w-5 md:h-7 md:w-7 text-white drop-shadow-lg" fill="white" />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/30 to-transparent"></div>
              </div>
              <div>
                <h1 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-desert-accent via-desert-sun to-desert-accent bg-clip-text text-transparent drop-shadow-sm">
                  IC-Rex
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-6 text-xs md:text-sm">
              <div className="flex items-center gap-1 md:gap-2 rounded-xl bg-gradient-to-br from-desert-accent/15 to-desert-accent/5 px-2 md:px-4 py-1 md:py-2 transition-all duration-300 hover:scale-105 hover:shadow-soft border border-desert-accent/20">
                <Heart className="h-4 w-4 md:h-5 md:w-5 text-desert-accent drop-shadow-sm" fill="currentColor" />
                <span className="font-bold text-desert-foreground">{finalScore}</span>
              </div>
              <div className="flex items-center gap-1 md:gap-2 rounded-xl bg-gradient-to-br from-desert-sun/15 to-desert-sun/5 px-2 md:px-4 py-1 md:py-2 transition-all duration-300 hover:scale-105 hover:shadow-soft border border-desert-sun/20">
                <Coins className="h-4 w-4 md:h-5 md:w-5 text-desert-sun drop-shadow-sm" />
                <span className="font-bold text-desert-foreground">{coinsCollected}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-2 md:px-4 py-4 md:py-8">
        <div className="grid gap-4 md:gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4 md:space-y-6">
            <Card className="overflow-hidden border-2 border-desert-accent/40 shadow-soft-xl transition-all duration-300 hover:shadow-soft-xl hover:border-desert-accent/60">
              <CardContent className="p-0">
                <div 
                  ref={gameContainerRef}
                  className="relative aspect-[16/9] bg-gradient-to-b from-desert-sky to-desert-sand"
                >
                  <canvas
                    ref={canvasRef}
                    className="h-full w-full cursor-pointer touch-none"
                    style={{ imageRendering: 'pixelated' }}
                    tabIndex={0}
                  />
                  
                  {gameState === 'menu' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-black/50 via-black/35 to-black/55 backdrop-blur-sm">
                      <div className="text-center space-y-6 md:space-y-10 p-4 md:p-8 max-w-2xl animate-fade-in">
                        <div className="space-y-3 md:space-y-5 animate-float">
                          <h2 className="text-5xl md:text-8xl font-bold text-white drop-shadow-2xl">
                            IC-Rex
                          </h2>
                          <div className="h-2 w-32 md:w-48 mx-auto bg-gradient-to-r from-transparent via-desert-sun to-transparent rounded-full shadow-soft-lg"></div>
                        </div>
                        
                        <Button
                          size="lg"
                          onClick={startGame}
                          className="group relative bg-gradient-to-r from-desert-sun via-desert-accent to-desert-sun hover:from-desert-accent hover:via-desert-sun hover:to-desert-accent text-white font-bold text-xl md:text-2xl px-10 md:px-16 py-8 md:py-10 shadow-soft-xl transition-all duration-300 hover:scale-110 hover:shadow-desert-sun/60 rounded-2xl border-2 border-white/20"
                        >
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/30 to-transparent"></div>
                          <Play className="mr-3 md:mr-4 h-6 w-6 md:h-8 md:w-8 transition-transform group-hover:scale-125" />
                          <span className="relative">Spiel starten</span>
                        </Button>
                      </div>
                    </div>
                  )}

                  {gameState === 'gameOver' && !showNameDialog && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-black/60 via-black/45 to-black/70 backdrop-blur-md">
                      <div className="text-center space-y-6 md:space-y-10 p-4 md:p-8 animate-fade-in">
                        <div className="space-y-3 md:space-y-5">
                          <h2 className="text-5xl md:text-7xl font-bold text-white drop-shadow-2xl">
                            Game Over!
                          </h2>
                          <div className="h-2 w-28 md:w-40 mx-auto bg-gradient-to-r from-transparent via-desert-accent to-transparent rounded-full shadow-soft-lg"></div>
                        </div>
                        
                        <div className="space-y-3 md:space-y-4 bg-black/40 rounded-2xl p-5 md:p-8 backdrop-blur-sm border border-white/10 shadow-soft-lg">
                          <p className="text-3xl md:text-5xl text-white/95 font-bold drop-shadow-lg">
                            Punkte: {finalScore}
                          </p>
                          <p className="text-xl md:text-3xl text-desert-sun drop-shadow-md font-semibold">
                            🪙 Münzen: {coinsCollected}
                          </p>
                        </div>
                        
                        <Button
                          size="lg"
                          onClick={startGame}
                          className="group bg-gradient-to-r from-desert-sun via-desert-accent to-desert-sun hover:from-desert-accent hover:via-desert-sun hover:to-desert-accent text-white font-bold text-xl md:text-2xl px-10 md:px-16 py-8 md:py-10 shadow-soft-xl transition-all duration-300 hover:scale-110 hover:shadow-desert-sun/60 rounded-2xl border-2 border-white/20"
                        >
                          <Play className="mr-3 md:mr-4 h-6 w-6 md:h-8 md:w-8 transition-transform group-hover:scale-125" />
                          Neu starten
                        </Button>
                      </div>
                    </div>
                  )}

                  {showOrientationWarning && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/85 backdrop-blur-sm z-50">
                      <div className="text-center space-y-4 p-6 max-w-sm">
                        <Smartphone className="h-16 w-16 mx-auto text-desert-sun animate-pulse" />
                        <h3 className="text-2xl font-bold text-white">
                          Bitte drehe dein Gerät
                        </h3>
                        <p className="text-white/80">
                          Dieses Spiel wird nur im Querformat unterstützt
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4 md:space-y-6">
            <Card className="border-2 border-desert-accent/40 bg-gradient-to-br from-desert-card to-desert-sand/60 shadow-soft-lg transition-all duration-300 hover:shadow-soft-xl hover:border-desert-accent/60">
              <CardHeader className="bg-gradient-to-r from-desert-accent/15 to-desert-sun/15 border-b border-desert-accent/20">
                <CardTitle className="flex items-center gap-2 md:gap-3 text-desert-foreground text-base md:text-xl">
                  <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-desert-sun to-desert-accent shadow-soft transition-transform duration-300 hover:scale-110">
                    <Trophy className="h-5 w-5 md:h-6 md:w-6 text-white drop-shadow-sm" />
                  </div>
                  <span className="font-bold">Bestenliste</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 md:pt-6">
                {topScores.length === 0 ? (
                  <div className="text-center py-6 md:py-8">
                    <Trophy className="h-10 w-10 md:h-12 md:w-12 mx-auto text-desert-muted/30 mb-3" />
                    <p className="text-xs md:text-sm text-desert-muted font-medium">
                      Noch keine Highscores
                    </p>
                    <p className="text-xs text-desert-muted/70 mt-2">
                      Sei der Erste!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 md:space-y-3">
                    {topScores.map(([name, score], index) => (
                      <div
                        key={`${name}-${index}`}
                        className="group flex items-center justify-between p-3 md:p-4 rounded-xl bg-gradient-to-r from-desert-accent/8 to-desert-sun/8 border border-desert-accent/15 transition-all duration-300 hover:from-desert-accent/20 hover:to-desert-sun/20 hover:scale-105 hover:shadow-soft"
                      >
                        <div className="flex items-center gap-2 md:gap-4">
                          <span className={`flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-full font-bold text-white text-xs md:text-base shadow-soft transition-transform duration-300 group-hover:scale-110 ${
                            index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                            index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                            index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                            'bg-gradient-to-br from-desert-accent to-desert-sun'
                          }`}>
                            {index + 1}
                          </span>
                          <span className="font-semibold text-desert-foreground group-hover:text-desert-accent transition-colors duration-300 text-sm md:text-base truncate max-w-[120px] md:max-w-none">
                            {name}
                          </span>
                        </div>
                        <span className="font-bold text-base md:text-lg text-desert-accent group-hover:text-desert-sun transition-colors duration-300">
                          {Number(score)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="rounded-xl overflow-hidden border-2 border-desert-accent/25 shadow-soft hidden lg:block transition-all duration-300 hover:border-desert-accent/40 hover:shadow-soft-lg">
              <img 
                src="/assets/generated/trex-section-divider.dim_400x150.png" 
                alt="T-Rex Silhouette" 
                className="w-full h-auto opacity-50 hover:opacity-70 transition-opacity duration-300"
              />
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-8 md:mt-16 border-t-2 border-desert-accent/30 bg-gradient-to-r from-desert-card/98 to-desert-sand/98 backdrop-blur-md shadow-soft-lg">
        <div className="container mx-auto px-4 py-6 md:py-8">
          <div className="flex flex-col items-center text-center">
            <p className="text-xs md:text-sm text-desert-muted font-medium">
              © 2025. Built with{' '}
              <Heart className="inline h-3 w-3 md:h-4 md:w-4 text-desert-accent animate-pulse" fill="currentColor" />{' '}
              using{' '}
              <a
                href="https://caffeine.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-desert-accent hover:text-desert-sun transition-colors duration-300 underline decoration-desert-accent/30 hover:decoration-desert-sun"
              >
                caffeine.ai
              </a>
            </p>
          </div>
        </div>
      </footer>

      <Dialog open={showNameDialog} onOpenChange={setShowNameDialog}>
        <DialogContent className="bg-gradient-to-br from-desert-card to-desert-sand border-2 border-desert-accent/40 shadow-soft-xl max-w-[90vw] md:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl md:text-2xl text-desert-foreground flex items-center gap-2 font-bold">
              <Trophy className="h-5 w-5 md:h-6 md:w-6 text-desert-sun" />
              Highscore speichern
            </DialogTitle>
            <DialogDescription className="text-desert-muted text-sm md:text-base">
              Glückwunsch! Du hast <span className="font-bold text-desert-accent">{finalScore} Punkte</span> erreicht 
              (inkl. <span className="font-bold text-desert-sun">{coinsCollected} Münzen</span>)! 
              Gib deinen Namen ein, um deinen Score zu speichern.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Dein Name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSubmitScore();
                }
              }}
              maxLength={20}
              className="bg-desert-light border-2 border-desert-accent/40 text-desert-foreground text-base md:text-lg py-4 md:py-6 focus:border-desert-accent transition-all duration-300 shadow-soft"
            />
          </div>
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button
              variant="outline"
              onClick={() => {
                setShowNameDialog(false);
                setPlayerName('');
              }}
              className="border-2 border-desert-accent/40 text-desert-foreground hover:bg-desert-accent/15 transition-all duration-300 w-full sm:w-auto"
            >
              Überspringen
            </Button>
            <Button
              onClick={handleSubmitScore}
              disabled={!playerName.trim() || submitScoreMutation.isPending}
              className="bg-gradient-to-r from-desert-sun to-desert-accent hover:from-desert-accent hover:to-desert-sun text-white font-bold transition-all duration-300 hover:scale-105 shadow-soft-lg w-full sm:w-auto"
            >
              {submitScoreMutation.isPending ? 'Speichern...' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Game;
