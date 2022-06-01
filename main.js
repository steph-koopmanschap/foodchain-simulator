/*
// NAME: Food Chain Simulator
// CONTRIBUTORS: Steph Koopmanschap
// VERSION: 1.0
*/

//GLOBAL CONSTANTS AND VARIABLES
//Globals start with a capital letter

//check if simulation is running
var IsRunning = false;
var GameSpeed = 1;
//Framerate
var FPS = 60 * GameSpeed;
var startTime;
//Screen Settings
var ScreenWidth = 800;
var ScreenHeight = 600;
var MainScreen;
var Canvas2D;
//Debugging mode for verbose logging
var DebugMode = true;
//Max number of displayable gameobjects
//NOTE: Computer starts freezing at >2000 GameObjects on i3 CPU
const GameObjectLimit = 1800; 
//All game objects
const GameObjects = [];
//Colors
var Black = "";
var White = "";
var DarkGreen = "";
var LightGreen = "";
var Yellow = "";
var Orange = "";
var DarkRed = "";
var LightRed = "";

class Vector {
    constructor(x, y, sourceX=0, sourceY=0) {
        this.x = x;
        this.y = y;
        this.sourceX = sourceX;
        this.sourceY = sourceY;
    }
    getLength() {
        return Math.sqrt((this.x * this.x) + (this.y * this.y));
    }
    Normalize() {
        return new Vector(this.x / this.getLength(), this.y / this.getLength());
    }
    dotProduct(vector2) {
        return (this.x * vector2.x) + (this.y * vector2.y);
    }
}

//Unit Vectors
//x-axis
const RIGHT = new Vector(1, 0);  
const LEFT = new Vector(-1, 0);
//y-axis
const UP = new Vector(0, -1);
const DOWN = new Vector(0, 1);
//diagonals
const UP_RIGHT = new Vector(1, -1);
const UP_LEFT = new Vector(-1, -1);
const DOWN_RIGHT = new Vector(1, 1);
const DOWN_LEFT = new Vector(-1, 1);
const NumberOfDirections = 8;

//CLASSES

//The game screen is divided into a grid system of 4 equal sections.
//Each section is proccesed one by one to increase performance.
//Each section can contain another grid divided in 4 more equal sections
//NOTE: FEATURE NOT YET IMPLEMENTED
class gridSystem {
    //x and y are the end points of the grid
    constructor(x, y) {
        this.section1 = {start: new Vector(0, 0), end: new Vector(this.x/2, this.y/2)}
        this.section2 = {start: new Vector(this.x/2, 0), end: new Vector(this.x, this.y/2)};
        this.section3 = {start: new Vector(0, this,y/2), end: new Vector(this.x/2, this.y)};
        this.section4 = {start: new Vector(this.section1.end.x, this.section1.end.y), end: new Vector(this.x, this.y)};
        //to make iterating easier
        this.sections = [this.section1, this.section2, ,this.section3, this.section4];
    }
}

//Base class for all visible game objects
//it has location, and size
class gameObject {
    constructor(x=0, y=0, width=1, height=1, color="black") {
        //Unique id of gameobject for references
        this.id = randIntRange(1, GameObjectLimit);
        this.isSelected = false;
        //Location
        this.x = x;
        this.y = y;
        //Size
        this.width = width;
        this.height = height;   
        //Color
        this.color = color;
        //Collision detection
        this.isColliding = false;
    }

    //update itself
    update() {

    }

    //draw itself
    draw() {
        Canvas2D.fillStyle = this.color;
        Canvas2D.fillRect(this.x, this.y, this.width, this.height);
    }
}

//Base class for plants. The lowest in the foodchain
class plant extends gameObject {
    constructor(x, y, width, height, color="green", maxFoodStorage=50, reproductionFactor=2, reproductionRate=6, lifeSpan="annual") {
        super(x, y, width, height, color);
        //How much food it gives to the organism it is eaten by
        this.maxFoodStorage = maxFoodStorage;
        this.foodStorage = maxFoodStorage;
        //How many children the plant has when it reproduces
        this.reproductionFactor = reproductionFactor;
        //When the plant reproduces in seconds
        this.reproductionRate = reproductionRate;
        //Plants have 2 types of lifespans:
        //"annual" - Mother plant dies when it reproduces
        //"perrenial" - Mother plant does NOT die when it reproduces 
        this.lifeSpan = lifeSpan;
        //Reproduction timer
        this.reproductionClockId = setInterval(this.reproduce.bind(this), reproductionRate*1000);
    } 

    //Plants reproduce themselves.
    reproduce() {
        for (let i = 0; i < this.reproductionFactor; i++) {
            //the new plants are created randomly around the mother plant.
            let offset = 25;
            let newX = randIntRange(this.x - offset, this.x + offset);
            let newY = randIntRange(this.y - offset, this.y + offset);
            GameObjects.push(new plant(newX, newY, this.width, this.height, this.color, this.maxFoodStorage, 
                                       this.reproductionFactor, this.reproductionRate, this.lifeSpan));
            //It takes energy to reproduce so its food storage decreases by 60%
            this.foodStorage -= this.foodStorage*0.6;
            //The mother plant dies
            if (this.lifeSpan === "annual") {
                stopClock(this.reproductionClockId);
                removeGameObject(this.id);
            }
        }
    }

    update() {
        //Photosynthesize
        //Increase food storage by 2 every second
        this.foodStorage += normalizeSecond(2);
        //limit total food storage
        if (this.foodStorage >= this.maxFoodStorage) {
            this.foodStorage = this.maxFoodStorage;
        }
    }
}

//Base class for animals. Animals can eat plant(herbivore), animals(carnivore), or both(omnivore)
class animal extends gameObject {
    constructor(x, y, width, height, color, diet, maxFoodStorage=50, speed=1, sightRadius=50, reproductionFactor=2, reproductionRate=8) {
        super(x, y, width, height, color);
        //How much hunger it relieves to the other animal when this animal is eaten.
        this.maxFoodStorage = maxFoodStorage;
        this.foodStorage = maxFoodStorage;
        //When hunger reaches 0 this animal dies. 100 hunger is healthy.
        this.hunger = 100;
        //Movement speed of animal
        this.speed = speed;
        //How far the animal can see or detect other objects
        this.sightRadius = sightRadius;
        //How many children the animal has when it reproduces
        this.reproductionFactor = reproductionFactor;
        //When the animal reproduces in seconds
        this.reproductionRate = reproductionRate;
        //String. Diet type defines what it can eat.
        //TYPES:
        //herbivore
        //carnivore
        //omnivore
        //fungivore
        //insectivore   
        this.diet = diet;
        //Chasing mode of animal
        this.isChasing = false;
        //Current target the animal is chasing
        this.currentTarget = [];
        //Reproduction timer
        this.reproductionClockId = setInterval(this.reproduce.bind(this), reproductionRate*1000);
    }

    //Animals reproduce themselves.
    reproduce() {
        for (let i = 0; i < this.reproductionFactor; i++) {
            //the new animals are created randomly around the mother animal.
            let offset = 25;
            let newX = randIntRange(this.x - offset, this.x + offset);
            let newY = randIntRange(this.y - offset, this.y + offset);
            GameObjects.push(new animal(newX, newY, this.width, this.height, this.color, this.diet, this.maxFoodStorage, 
                                       this.speed, this.sightRadius, this.reproductionFactor, this.reproductionRate));
            //It takes energy to reproduce so its food storage decreases by 15% and its hunger decreases by 5%
            this.foodStorage -= this.foodStorage*0.15;
            this.hunger -= this.hunger*0.05;

        }
    }

    //Animal movements
    move() {
        if (this.isChasing === false) {
            //If not chasing choose a random direction to go to
            let randomDir = randIntRange(0, NumberOfDirections);
            switch(randomDir) {
                //RIGHT
                case 0:
                    this.x += this.speed * RIGHT.x;
                    this.y += this.speed * RIGHT.y;
                    break;
                //LEFT
                case 1:
                    this.x += this.speed * LEFT.x;
                    this.y += this.speed * LEFT.y;
                    break;
                //UP
                case 2:
                    this.x += this.speed * UP.x;
                    this.y += this.speed * UP.y;
                    break;
                //DOWN
                case 3:
                    this.x += this.speed * DOWN.x;
                    this.y += this.speed * DOWN.y;
                    break;
                //UP_RIGHT
                case 4:
                    this.x += this.speed * UP_RIGHT.x;
                    this.y += this.speed * UP_RIGHT.y;
                    break;
                //UP_LEFT
                case 5:
                    this.x += this.speed * UP_LEFT.x;
                    this.y += this.speed * UP_LEFT.y;
                    break;
                //DOWN_RIGHT
                case 6:
                    this.x += this.speed * DOWN_RIGHT.x;
                    this.y += this.speed * DOWN_RIGHT.y;
                    break;
                //DOWN_LEFT
                case 7:
                    this.x += this.speed * DOWN_LEFT.x;
                    this.y += this.speed * DOWN_LEFT.y;
                    break;
                //STAND STILL
                default:
                    this.x = this.x;
                    this.y = this.y;
                    break;
            }
        }
        //start chasing a target
        else {
            let targetLocation = new Vector(this.currentTarget[0].x, this.currentTarget[0].y);
            let targetDirection = targetLocation.Normalize();
            this.x += this.speed * targetDirection.x;
            this.y += this.speed * targetDirection.y;
        }
    }

    //Wrap around the screen
    wrap() {
        //x-axis
        if (this.x > ScreenWidth) {
            this.x = 1;
        }
        if (this.x < 0) {
            this.x = ScreenWidth-1;
        }
        //y-axis
        if (this.y > ScreenHeight) {
            this.y = 1;
        }
        if (this.y < 0) {
            this.y = ScreenHeight-1;
        }
    }

    //Check if a prey or predator is in sight
    sightDetection(obj2) {
        //Predator-prey chasing mechanics
        //First check if a prey is within the sightRadius of the animal.
        if (Math.abs(this.x - obj2.x) < this.sightRadius && Math.abs(this.y - obj2.y) < this.sightRadius) {
            //herbivore and omnivore chasing plant
            if (this.diet === "herbivore" || this.diet === "omnivore") {
                if (obj2 instanceof plant) {
                    this.isChasing = true;    
                    this.currentTarget = [obj2];
                }
            }
            //carnivore and omnivore chasing herbivore
            if (this.diet === "carnivore" || this.diet === "omnivore") {
                if (obj2 instanceof animal && obj2.diet === "herbivore") {
                    this.isChasing = true;    
                    this.currentTarget = [obj2];
                    //carnivores increase speed once they chase
                    if (this.diet === "carnivore") {
                        this.speed = 1.1;
                    }
                }
            }
        } else {
            //this.isChasing = false;
            //this.currentTarget = [];
        }
    }

    //Called when animal dies
    die() {
        if (this.hunger <= 0) {
            stopClock(this.reproductionClockId);
            removeGameObject(this.id);
        }
    }

    update() {
        
        /*
        for (let i = 0; i < GameObjects.length; i++) {  
            if (GameObjects[i] instanceof animal === true) {
                GameObjects[i].collisionDetection(GameObjects[i]);
            }
        }
        */

        this.move();
        this.wrap();
        this.die();

        //limit total food storage
        if (this.foodStorage >= this.maxFoodStorage) {
            this.foodStorage = this.maxFoodStorage;
        }
        //limit total hunger
        if (this.hunger >= 100) {
            this.hunger = 100;
        }
        
        //decrease hunger by 7 every second
        this.hunger -= normalizeSecond(8);
        //Make the animal more transparant the more hungrier it is.
        //this.health = this.hunger/100;
        //this.color = `rgba(1, 0, 0, ${this.health})`;
    }

    /*
    draw() {
        Canvas2D.fillStyle = this.color;
        Canvas2D.fillRect(this.x, this.y, this.width, this.height);
        if (this.isSelected === true) {
            Canvas2D.strokeStyle = this.color;
            Canvas2D.beginPath();
            Canvas2D.arc(this.x, this.y, this.sightRadius, 0, 2 * Math.PI);
            Canvas2D.stroke();
            Canvas2D.closePath();
        } 
    }
    */
}

//Organisms can not pass through wall objects
class wall extends gameObject {
    constructor(x, y, width, height, color) {
        super(x, y, width, height, color);
    }
}

//Global Functions

var GlobalClockID = 0;

//Clock that repeats a function every Hertz
//Regulates framerate and gameloop
function startClock(fps) {
    let frameRate = (1/fps)*1000;

    /*
    To Ensure that execution duration is shorter than interval frequency.    
    May need to change this into

    function mainLoop() {
            GlobalClockID = setTimeout() (function() {
                getInput();
                update();
                draw();
                //Restart the loop
                mainLoop();
        }, frameRate);
    }

    */

    //If mainLoop takes longer than frameRate(default 16ms) to execute, code might not execute in order
    GlobalClockID = setInterval(function() {
        mainLoop();
    }, frameRate);
}

//Stop a clock by its clock id
function stopClock(id) {
    clearInterval(id);
}

//returns a random integer between min and max
function randIntRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

//Returns a random integer between 0 and screenWidth (create random point on x-axis)
function randIntX() {
    return randIntRange(0, ScreenWidth);
}

//Returns a random integer between 0 and ScreenHeight (create random point on x-axis)
function randIntY() {
    return randIntRange(0, ScreenHeight);
}

//Returns a value which would count as the same value but for 1 second.
//For example if FPS = 60
//And you want decrease value x by y every second
//Normally x would be subtracted by y 60 times per second
//This function divides y by FPS so that x decreases by y every second
function normalizeSecond(value) {
    return value/FPS;
}

//Remove an object from the game by its unique id
function removeGameObject(objID) {
    GameObjects.forEach((obj) => {
        if (obj.id === objID) {
            GameObjects.splice(GameObjects.indexOf(obj), 1);
            //delete GameObjects[GameObjects.indexOf(obj)]
        }   
    });
}

//object1 eats object2
function eat(object1, object2) {
    //object1.isChasing = false; //not sure where to stop the chasing
    object1.hunger += object2.foodStorage;
    object1.foodStorage += object2.foodStorage;
    stopClock(object2.reproductionClockId);
    removeGameObject(object2.id);
}

//eating and foodchain mechanics
function foodChainCheck(object1, object2) {        
    //Herbivore eats a plant
    if (object1 instanceof animal === true && 
        object2 instanceof plant === true &&
        object1.diet === "herbivore" ) {
            eat(object1, object2);
            
    }
    //Carnivore eats herbivore
    if (object1 instanceof animal === true && 
        object2 instanceof animal === true &&
        object1.diet === "carnivore" && 
        object2.diet === "herbivore") {
            eat(object1, object2);
    } 
    //Omnivore eats herbivore or carnivore
    if (object1 instanceof animal === true && 
        object2 instanceof animal === true &&
        object1.diet === "omnivore" &&
        object2.diet !== "omnivore") {
            eat(object1, object2);
    //Omnivore eats plant
    } else if (object1 instanceof animal === true &&
               object2 instanceof plant === true &&
               object1.diet === "omnivore") {
           eat(object1, object2);
    }
}

//Only checks rectangle intersections
//Check collision between 2 objects
function checkCollision(obj1, obj2) {
    if (obj2.x > obj1.width + obj1.x ||
        obj1.x > obj2.width + obj2.x ||
        obj2.y > obj1.height + obj1.y ||
        obj1.y > obj2.height + obj2.y) {
            return false;
    }
    return true;
}

//checks collision of all gameobects
function checkCollisions() {
    let object1;
    let object2;

    //reset collision states
    for (let i = 0; i < GameObjects.length; i++) {
        GameObjects[i].isColliding = false;
    }

    //Collision check
    for (let i = 0; i < GameObjects.length; i++) {
        object1 = GameObjects[i];
        for (let j = 0; j < GameObjects.length; j++) {
            object2 = GameObjects[j];
            //first check if object is in sight (only animals have sight)
            if (object1 instanceof animal) {
                object1.sightDetection(object2);
            }
            //collision is detected
            if (checkCollision(object1, object2) === true) {
                object1.isColliding = true;
                object2.isColliding = true;
                //Check who eats who
                foodChainCheck(object1, object2);
            }
        }
    }
}

function mainLoop() {
    //Check how long it takes for 1 program cycle to execute.
    console.time('mainLoopTime');

    getInput();

    //Main proccesing
    //Check how long it takes for 1 update to execute.
    console.time('updateLoopTime');
    update();
    let updateLoopTime = console.timeEnd('updateLoopTime');

    //Draw the screen after updating
    //Check how long it takes for 1 draw to execute.
    console.time('drawLoopTime');
    draw();
    let drawLoopTime = console.timeEnd('drawLoopTime');

    let mainLoopTime = console.timeEnd('mainLoopTime');

    if (DebugMode === true) {
        console.log("*******************");
        /*
        console.log("MAIN LOOP EXECUTION TIME:");
        console.log(mainLoopTime + " ms");
        console.log("UPDATE LOOP EXECUTION TIME:");
        console.log(updateLoopTime + " ms");
        console.log("DRAW LOOP EXECUTION TIME:");
        console.log(drawLoopTime + " ms");
        console.log("*******************");
        */
    }
}

//Get user input
function getInput() {
    //User input has not been added yet
}

//Update the game
function update() {
    //gameObects.length (the number of total GameObjects) is stored in memory once by let l to increase performance.
    //Or else GameObjects.length is accessed every for loop cycle.
    //NOTE: Using l causes Uncaught TypeError: GameObjects[i] is undefined 
    //      when multiple objects are deleted in a short period
    //let l = GameObjects.length;
    //for (let i = 0; i < l; i++) {
    //update every game obect
    for (let i = 0; i < GameObjects.length; i++) {  
        GameObjects[i].update();
        }

    //Remove 75% of all plants when they are exceeding limits to stop the simulation from freezing
    if (GameObjects.length >= GameObjectLimit) {
        for (let i = 0; i < Math.floor(GameObjects.length); i++) {
            if (GameObjects[i] instanceof plant) {
                removeGameObject(GameObjects[i].id);
            }
        }
    }

    checkCollisions();
}

function clearCanvas() {
    Canvas2D.fillStyle = "black";
    Canvas2D.clearRect(0, 0, ScreenWidth, ScreenHeight);
}

//Draw on the screen
function draw() {
    //remove the previous frame first
    clearCanvas();

    let l = GameObjects.length;
    //Draw every game obect
    for (let i = 0; i < l; i++) {
        GameObjects[i].draw();
    }
}

//Populate the game with initial creatures.
function populate() {
    //initial population numbers
    let numberOfPlants = 50;
    let numberOfHerbivores = Math.floor(numberOfPlants * (0.75));
    let numberOfCarnivores = Math.floor(numberOfPlants * (0.50));
    let numberOfOmnivores = Math.floor(numberOfPlants * (0.33));

    /*
    To Create a new plant type:
     GameObjects.push(new plant( parameters );
     Plant parameters:
     ---
     x, y, width, height, color, maxFoodStorage, reproductionFactor, reproductionRate, lifeSpan
     ---
    Lifespan options:
    "annual"
    "perrenial"

    See plant class for more information.
    */

    /*
    To Create a new animal type:
     GameObjects.push(new animal( parameters );
     animal parameters:
     ---
     x, y, width, height, color, diet, maxFoodStorage, speed, sightRadius, reproductionFactor, reproductionRate
     ---
    diet options:
    "herbivore"
    "carnivore"
    "omnivore"

    See animal class for more information.
     
    */
    
    //general test plant
    //GameObjects.push(new plant(randIntX(), randIntY(), 10, 10, "green"));
    //general test animal
    //GameObjects.push(new animal(randIntX(), randIntY(), 20, 10, "yellow", "herbivore", 75, 0.5, 55, 1, randIntRange(9, 12)));
    
    //Populate plants
    //---------------
    //populate grasses
    for (let i = 0; i < numberOfPlants; i++) {
        GameObjects.push(new plant(randIntX(), randIntY(), 3, 15, "green", 25, 2, randIntRange(6, 9), "perrenial"));
    }
    //populate vegetables
    for (let i = 0; i < Math.floor(numberOfPlants/2); i++) {
        GameObjects.push(new plant(randIntX(), randIntY(), 10, 10, "green", 50, 1, randIntRange(7, 12), "annual"));
    }
    //populate herbivores
    //---------------
    //populate cows
    for (let i = 0; i < numberOfHerbivores; i++) {
        GameObjects.push(new animal(randIntX(), randIntY(), 20, 10, "yellow", "herbivore", 75, 0.5, 55, 1, randIntRange(9, 12)));
    }
    //populate rabbits
    for (let i = 0; i < numberOfHerbivores; i++) {
        GameObjects.push(new animal(randIntX(), randIntY(), 10, 10, "yellow", "herbivore", 30, 1, 55, 1, randIntRange(7, 11)));
    }
    //populate carnivores
    //---------------
    //populate wolves
    for (let i = 0; i < numberOfCarnivores; i++) {
        GameObjects.push(new animal(randIntX(), randIntY(), 10, 10, "red", "carnivore", 75, 1, 55, 1, randIntRange(9, 12)));
    }
    //populate omnivores
    //---------------
    //populate humans
    for (let i = 0; i < numberOfOmnivores; i++) {
        GameObjects.push(new animal(randIntX(), randIntY(), 10, 10, "blue", "omnivore", 85, 0.75, 55, 1, randIntRange(9, 18)));
    }
    
    if (DebugMode === true) {
        let totalInitialPop = numberOfPlants + numberOfHerbivores + numberOfCarnivores + numberOfOmnivores;
        console.log("=================");
        console.log("Program Start");
        console.log("=================");GameObjectLimit
        console.log("Total GameObjects: " + GameObjectLimit);
        console.log("Total initial population: " + totalInitialPop);
        console.log("Total GameObjects: " + GameObjects.length);
        console.log("=================");
    }
}

//Initialize and start program
function init() {
    //create the screen
    MainScreen = document.createElement("canvas");
    MainScreen.width = ScreenWidth;
    MainScreen.height = ScreenHeight;
    MainScreen.style.margin = "10px";
    MainScreen.style.border = "4px solid orange";
    MainScreen.style.backgroundColor = "black";
    Canvas2D = MainScreen.getContext("2d");
    document.body.insertBefore(MainScreen, document.body.childNodes[3]);
    
    startClock(FPS);
    IsRunning = true;
    startTime = Date;
    populate();

    if (DebugMode === true) {
        setInterval(function() {
            debugLog();
        }, 1000);
    }
}

function debugLog() {
    console.log("=================");
    console.log("Total GameObjects: " + GameObjects.length);
    let runTime = Date - startTime;
    console.log(Date);
    console.log("Run time: " + runTime + " seconds");
    console.log()
    console.log("=================");
}

//start the program
init();
