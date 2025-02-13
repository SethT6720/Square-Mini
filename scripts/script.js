//Imports funcs from helpers
import help from './helpers.js';
const { get, hide, show, buttonClick, sleep } = help;

//Import storage stuff
import storage from './storage.js';
const { save, load } = storage;

// Divs/elements
const opaqueBackground = get("opaqueBackground");
const startScreen = get("startScreen");
const gameScreen = get("gameScreen");
const gameOver = get("gameOver");
const score = get("score");
const deadScore = get("deadScore");
const highScore = get("highScore");

// Buttons
const initGame = get("initGame");
const restart = get('restart');

// Canvas
let canvas = {
  ele: get("canvas"),
  style: get("canvas").style,
  ctx: get("canvas").getContext("2d"),

  height: window.innerHeight,
  width: window.innerWidth,
};

//Set canvas dimensions
canvas.ele.height = canvas.height;
canvas.ele.width = canvas.width;

//Find the center of the canvas
canvas.center = { 
  x: Math.round(canvas.width / 2), 
  y: Math.round(canvas.height / 2) 
};

//Finds the smaller dimension of the window to make a square that fits on the page
canvas.smaller = canvas.height;
if (canvas.width < canvas.height) {
  canvas.smaller = canvas.width;
}
//Half of the smaller dimension makes calculations/positioning easier
canvas.half = Math.round(canvas.smaller / 2);

//Clear canvas essentially
canvas.init = () => {
  canvas.ctx.fillStyle = `rgb(40, 40, 40)`; //Bg color
  canvas.ctx.strokeStyle = "white"; //Border color
  canvas.ctx.fillRect(0, 0, canvas.width, canvas.height); //Clear canvas/color bg

  canvas.ctx.strokeRect(
    canvas.center.x - canvas.half / 2, 
    canvas.center.y - canvas.half / 2, 
    canvas.half, canvas.half
  ); //boundary for the 'square'
}

//game object
let game =  {
  boundaries: { //coordinates for the top left and bottom right of the 'square' boundary/container
    x1: canvas.center.x - canvas.half / 2, 
    x2: canvas.center.x + canvas.half / 2, 
    y1: canvas.center.y - canvas.half / 2, 
    y2: canvas.center.y + canvas.half / 2 
  },

  projectileBoundaries: { //coords for the top left and bottom right of the projectiles spawn area/deletion boundary
    x1: canvas.center.x - canvas.half * 0.75, 
    x2: canvas.center.x + canvas.half * 0.75, 
    y1: canvas.center.y - canvas.half * 0.75, 
    y2: canvas.center.y + canvas.half * 0.75 
  },

  mousePos: { x: 0, y: 0 }, //Position of the mouse
  inGame: false, 

  scoreTotal: 0,
  highScore: 0,
  score: 0
};

//Get/Establish high score from localStorage
if (!load("highScore")) {
  save("highScore", "0");
} else {
  game.highScore = Number(load("highScore"))
}


class thingy { //class constructor for the 'square'. only reason i did this was to make calculations easier and to use this.blablabla
  constructor(x, y, dx, dy, scale, speedScale, color, maxHealth) {
    this.x = x;
    this.y = y;
    this.dx = dx; //not velocity, but x distance to mouse
    this.dy = dy; //same as above
    this.scale = scale; //percentage of the boundary size the square takes up
    this.size = (game.boundaries.x2 - game.boundaries.x1) * this.scale; //pixel size of the 'square'
    this.radius = this.size / 2;
    this.speedScale = speedScale; //percentage of the boundary size the square can move in one 'tick' i guess? idrk it's a pretty small decimal usually
    this.speed = (game.boundaries.x2 - game.boundaries.x1) * this.speedScale;
    this.color = color;
    this.maxHealth = maxHealth;
    this.health = maxHealth;
  }

  draw() {
    canvas.ctx.strokeStyle = 'white';
    canvas.ctx.lineWidth = 4; 
    canvas.ctx.fillStyle = this.color;

    //draws the 'square's' border
    canvas.ctx.beginPath();
    canvas.ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
    canvas.ctx.stroke();


    //I'm really proud of this actually, uses trig to fill up the percentage of the 'square' in proportion to health
    let percent = (this.health / this.maxHealth) * this.size; //health percent decimal
    percent -= this.radius; //sin value, i can sketch i pic for you sometime to show you why you do this
    let startAngle, endAngle; //declare angles


    let soh = Math.max(-1, Math.min(1, percent / this.radius)); //opposite over hypotenuse, makes sure it is between -1 and 1 so that thinks don't get funky
    startAngle = 2 * Math.PI - (Math.asin(soh)); //radian calculations, i can explain this too
    endAngle = Math.PI - startAngle;

    canvas.ctx.beginPath(); //fills up the circle in coordination with health percentage
    canvas.ctx.arc(this.x, this.y, this.radius, startAngle, endAngle);
    canvas.ctx.fill();


    canvas.ctx.lineWidth = 1; //resets line width
  }

  hit() { //on hit, still need to add game over screen
    this.health -= 1;
    if (this.health <= 0) {
      this.health = 0;
      onDeath();
    }
  }
}

class Projectile { //constrctor for the projectiels, slightly different from the thingy class but not by much
  constructor(x, y, angle, speedScale, scale, color) {
    this.x = x;
    this.y = y;
    this.angle = angle; //angle to the 'square' when created/direction it moves
    this.speedScale = speedScale; //same as thingy
    this.speed = (game.boundaries.x2 - game.boundaries.x1) * this.speedScale;
    this.scale = scale; //same as thingy
    this.size = (game.boundaries.x2 - game.boundaries.x1) * this.scale;
    this.radius = this.size / 2;
    this.color = color;
    this.active = true; //checks if projectile needs to be deleted
  }

  update(delta) { //updates projectile, delta is important, but that will be covered in game loop
    this.x += Math.cos(this.angle) * this.speed * delta; //updates x and y positions
    this.y += Math.sin(this.angle) * this.speed * delta;

    this.draw();

    // Check if projectile is out of bounds
    if (
      this.x < game.projectileBoundaries.x1 ||
      this.x > game.projectileBoundaries.x2 ||
      this.y < game.projectileBoundaries.y1 ||
      this.y > game.projectileBoundaries.y2
    ) {
      this.active = false; //Marks for deletion
    }

    if (this.checkCollision()) { //checks if it is hitting the 'square'
      this.active = false;
      square.hit();
      return 'dead'; // returns this so that it doesn't add score when a projectile hits the player
    }
  }

  checkCollision() { //checks if projectile is hitting the 'square'
    let dx = this.x - square.x; //distance between center points
    let dy = this.y - square.y;
    let distance = Math.sqrt(dx * dx + dy * dy); //pythagorean theorem for the actual distance

    if (distance < this.radius + square.radius) {
      return true; //adds the radii of the two objects to check for collision
    } 
    return false;
  }

  draw() { //draw the projectile
    canvas.ctx.fillStyle = this.color;
    canvas.ctx.beginPath();
    canvas.ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
    canvas.ctx.fill();
  }
}

let square = new thingy(canvas.center.x, canvas.center.y, 0, 0, 0.25, 0.25, "white", 10); //declare 'square'

let projectiles = []; //holds all projectiles

let lastProjectileTime = 0; //time since last projectile was created
let projectileInterval = 500; //interval between projectile spawns
let lastTime = 0; //timestamp for the last frame
let deltaMax = 0.05; //sets max for delta time

function gameLoop(timestamp) { //game loop animation frame
  if (!game.inGame) return; //Ends loop if out of game

  let deltaTime = Math.min((timestamp - lastTime) / 1000, deltaMax); //delta time is the time between frames is needed because of the refresh rate difference between different computers, i will tell you about this tomorrow
  lastTime = timestamp; //updates last time

  canvas.init(); //Clear canvas

  //Shoot projectiles if enough time has passed
  if (timestamp - lastProjectileTime > projectileInterval) {
    lastProjectileTime = timestamp;
    spawnProjectile();
  }

  //Update projectiles
  projectiles.forEach((projectile, index) => {
    let check = projectile.update(deltaTime); 
    if (check === 'dead') { // if collided with square, delete projectile w/o adding score
      projectiles.splice(index, 1);
    } else if (!projectile.active) {
      projectiles.splice(index, 1); //add score once deleted out of bounds
      game.score += 1;
    }
  });

  //Update score ele
  score.innerText = `Score: ${game.score}`;

  //Move the square towards mouse
  let dx = (game.mousePos.x - square.x);
  let dy = (game.mousePos.y - square.y);
  let dist = Math.sqrt(dx * dx + dy * dy); //more pythagorean theorem stuff to find distance to mouse

  if (dist > square.speed * deltaTime) { //mades sure unnecessary movements aren't made
    let angle = Math.atan2(dy, dx); //angle needed to move towards mouse, simple trig
    square.x += Math.cos(angle) * square.speed * deltaTime; //updates x and y positions in coordination with angle
    square.y += Math.sin(angle) * square.speed * deltaTime;
  }

  //Keep the square within the boundaries, the + 3 is because of the lineWidth
  square.x = Math.max(game.boundaries.x1 + square.radius + 3, Math.min(game.boundaries.x2 - square.radius - 3, square.x));
  square.y = Math.max(game.boundaries.y1 + square.radius + 3, Math.min(game.boundaries.y2 - square.radius - 3, square.y));

  //Draw the square
  square.draw();

  requestAnimationFrame(gameLoop); //Call next frame
}


function spawnProjectile() {
  // Choose a side for the projectile to shoot from, 0 = top, 1 = bottom, 2 = left, 3 = right
  let edge = Math.floor(Math.random() * 4);
  let range = game.projectileBoundaries.x2 - game.projectileBoundaries.x1; //range of values along the edge
  let coord = Math.floor(Math.random() * range); //random value along the edge
  let x, y, angle; //declare vars

  switch (edge) { //sets x and y values based on the edge
    case 0:
      x = game.projectileBoundaries.x1 + coord;
      y = game.projectileBoundaries.y1;
      break;
    case 1:
      x = game.projectileBoundaries.x1 + coord;
      y = game.projectileBoundaries.y2;
      break;
    case 2:
      x = game.projectileBoundaries.x1;
      y = game.projectileBoundaries.y1 + coord;
      break;
    case 3:
      x = game.projectileBoundaries.x2;
      y = game.projectileBoundaries.y1 + coord;
      break;
  }

  angle = Math.atan2(square.y - y, square.x - x); //angle towards the square
  projectiles.push(new Projectile(x, y, angle, 0.5, 0.04, "white")); //add projectile to the array
}

function onDeath() {
  square.health = square.maxHealth;
  square.x = canvas.center.x;
  square.y = canvas.center.y;
  game.inGame = false;
  deadScore.innerText = game.score;
  game.scoreTotal += score;
  if (game.score > game.highScore) {
    game.highScore = game.score;
  }
  save("highScore", game.highScore.toString());
  highScore.innerText = game.highScore;
  game.score = 0;
  canvas.init();
  show(gameOver);
  show(opaqueBackground);
}


game.init = () => { //game initializaiton
  projectiles = []; //reset projectiles
  game.score = 0; //reset score
  game.inGame = true; //sets game to in game
  requestAnimationFrame(gameLoop); //calls first animation frame
}


//resizes everything if window is resized this is why scale and speedScale are a thing
window.addEventListener("resize", () => {
  canvas.height = window.innerHeight;
  canvas.width = window.innerWidth;
  canvas.ele.height = canvas.height;
  canvas.ele.width = canvas.width;
  canvas.center = { x: Math.round(canvas.width / 2), y: Math.round(canvas.height / 2) };
  canvas.smaller = canvas.height;
  if (canvas.width < canvas.height) {
    canvas.smaller = canvas.width;
  }
  canvas.half = Math.round(canvas.smaller / 2);
  game.boundaries = { x1: canvas.center.x - canvas.half / 2, x2: canvas.center.x + canvas.half / 2, y1: canvas.center.y - canvas.half / 2, y2: canvas.center.y + canvas.half / 2 };
  game.projectileBoundaries =  {
    x1: canvas.center.x - canvas.half * 0.75, 
    x2: canvas.center.x + canvas.half * 0.75, 
    y1: canvas.center.y - canvas.half * 0.75, 
    y2: canvas.center.y + canvas.half * 0.75 
  };
  canvas.init();
});

window.addEventListener("load", () => {
  canvas.init();
});

//Mouse position getter
window.addEventListener("mousemove", (e) => {
  game.mousePos.x = e.clientX;
  game.mousePos.y = e.clientY;
});

// Button Listeners

buttonClick(initGame, () => {
  hide(startScreen);
  hide(opaqueBackground);
  game.init();
});

buttonClick(restart, () => {
  hide(gameOver);
  hide(opaqueBackground);
  game.init();
});
