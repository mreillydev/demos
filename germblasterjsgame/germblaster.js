// Copyright 2025 Michael Reilly <mreilly@mreilly.dev>

// Constants

var Fps = 60;
var RepeatedFireRate = 150;

var BaseSize = 850;
var ClrLo = 100;
var ClrHi = 250;
var BlinkTime = 60;
var BlinkFreq = 15;
var TrnspLo = 0.3;
var TrnspHi = 0.9;
var AccEdge = -1.075;
var LevelMax = 5;

// Enemies to spawn per level

var LevelSpawn =
[
    0,
    4,
    8,
    16,
    32,
]

// Text to show per level

var LevelText =
[
  "",
  "Level 1: Something's happening at the edges...",
  "Level 2: They can Respawn?",
  "Level 3: Faster...",
  "Level 4: CHAOS!!!",
];

// Runtime variables

var Frames = 0;
var Seconds = 0;
var MouseX = window.innerWidth / 2;
var MouseY = window.innerHeight / 2;

// Reset by reset()

var Cv = $("canvas");
var Ctx = Cv.getContext("2d");

var Died = false;
var Scaling = 1.0;
var Level = 1;
var Kills = 0;
var Extra = 0.0;
var Plr = null;
var Germs = [];
var Bolts = [];
var BoltTimer = undefined;

// Basic functions

// Element id wrapper
function $(id)
{
    return document.getElementById(id);
}

// Force val into the inclusive range [lwr, upr]
function forceRange(val, lwr, upr)
{
    if(val > upr)
        return upr;
    else if(val < lwr)
        return lwr;
    return val;
}

// Return a random float or integer (if type is "i") within the provided range
function randRange(lwr, upr, type)
{
    var tmp = lwr + Math.random() * (upr - lwr);
    if(type === "i")
        tmp = Math.round(tmp);
    return tmp;
}

// Return -1 50% of the time, 1 the other 50%
function randSign()
{
    return (Math.random() < 0.5 ? -1 : 1);
}

// Return a random RGBA color with range provided by constants
function randColor()
{
    return "rgba(" + randRange(ClrLo, ClrHi, "i") + "," +
                     randRange(ClrLo, ClrHi, "i") + "," +
                     randRange(ClrLo, ClrHi, "i") + "," +
                     randRange(TrnspLo, TrnspHi) + ")";
}

// Return true if two circles touch
function touches(x0, y0, r0, x1, y1, r1)
{
    return Math.pow(x0 - x1, 2) + Math.pow(y0 - y1, 2) <=
           Math.pow(r0 + r1, 2);
}

// Specific functions

// Return velocity for various game objects specified by type
function veloc(type)
{
    var tmp = 0.0;
    switch(type)
    {
    case "p"  : tmp = 8.0; break;
    case "pm" : tmp = 2.0; break;
    case "pM" : tmp = 14.0; break;
    case "b"  : tmp = 16.0; break;
    case "gl" : tmp = Math.min(2.0 + Extra, 7.0); break;
    case "gh" : tmp = Math.min(4.0 + Extra, 8.0); break;
    case "gm" : tmp = -8.0; break;
    case "gM" : tmp = 8.0; break;
    }
    return Scaling * tmp;
}

// Return circle radius for various game objects specified by type
function radius(type)
{
    var tmp = 0.0;
    switch(type)
    {
        case "b":  tmp =  8.0; break;
        case "p":  tmp = 20.0; break;
        case "gl": tmp = 40.0; break;
        case "gh": tmp = 60.0; break;
    }
    return Scaling * tmp;
}

// Player class representing game object movable by user
function Player()
{
    this.rdn = 0.0;
    this.vel = veloc("p");
    this.R = radius("p");
    this.X = MouseX;
    this.Y = MouseY;
    this.color = "#ff0000";
    this.radianto = function(x, y)
    {
        if(this.X === x)
        {
            if(y > this.Y)
                return 1.5 * Math.PI;
            else if(y < this.Y)
                return 0.5 * Math.PI;
            else
                return 0.0;
        }
        else
        {
            var tmp = Math.atan( (y - this.Y) / (x - this.X) );
            if(x < this.X)
                tmp += Math.PI;
            return tmp;
        }
        return 0.0;
    }
    this.draw = function()
    {
        Ctx.beginPath();
        Ctx.arc(this.X, this.Y, this.R, 0, 2 * Math.PI);
        Ctx.closePath();
        Ctx.fillStyle = this.color;
        Ctx.fill();
    }
    this.move = function()
    {
        if( ! touches(this.X, this.Y, this.R, MouseX, MouseY, 0))
        {
            this.rdn = this.radianto(MouseX, MouseY);
            this.X += this.vel * Math.cos(this.rdn);
            this.Y += this.vel * Math.sin(this.rdn);
        }
    }
}

// Bolt class representing weapons output fired by user
function Bolt()
{
    this.rdn = Plr.rdn;
    this.vel = veloc("b");
    this.R = radius("b");
    this.X = Plr.X + 1.25 * Plr.R * Math.cos(this.rdn);
    this.Y = Plr.Y + 1.25 * Plr.R * Math.sin(this.rdn);
    this.color = "#ff0000";
    Bolt.prototype.draw = function()
    {
        Ctx.beginPath();
        Ctx.arc(this.X, this.Y, this.R, 0, 2 * Math.PI);
        Ctx.closePath();
        Ctx.fillStyle = this.color;
        Ctx.fill();
    }
    Bolt.prototype.move = function()
    {
       this.X += this.vel * Math.cos(this.rdn);
       this.Y += this.vel * Math.sin(this.rdn);
    }
}

// Germ class representing enemies
function Germ(blink)
{
    if(blink && Level >= 3)
        Extra += 0.1;
    this.R = randRange(radius("gl"), radius("gh"));
    this.X = randRange(this.R, Cv.width - this.R);
    this.Y = randRange(this.R, Cv.height - this.R);
    this.dX = randRange(veloc("gl"), veloc("gh")) * randSign();
    this.dY = randRange(veloc("gl"), veloc("gh")) * randSign();
    this._color = randColor();
    this.color = blink ? "#ffffff" : this._color;
    this.age = 0;
    Germ.prototype.draw = function()
    {
        this.age++;
        if(this.age <= BlinkTime)
        {
            if(this.age % BlinkFreq === 0)
            {
                if(this.color === this._color)
                    this.color = "#ffffff";
                else
                    this.color = this._color;
            }
        }
        else
        {
            this.color = this._color;
        }
        Ctx.fillStyle = this.color;
        Ctx.beginPath();
        Ctx.arc(this.X, this.Y, this.R, 0, 2 * Math.PI);
        Ctx.closePath();
        Ctx.fill();
    }
    Germ.prototype.move = function()
    {
        this.X += this.dX;
        if(this.X < this.R)
        {
            this.X = 2 * this.R - this.X;
            this.dX = forceRange(this.dX * AccEdge, veloc("gm"), veloc("gM"));
        }
        else if(this.X >= Cv.width - this.R)
        {
            this.X = 2 * (Cv.width - this.R) - this.X;
            this.dX = forceRange(this.dX * AccEdge, veloc("gm"), veloc("gM"));
        }

        this.Y += this.dY;
        if(this.Y < this.R)
        {
            this.Y = 2 * this.R - this.Y;
            this.dY = forceRange(this.dY * AccEdge, veloc("gm"), veloc("gM"));
        }
        else if(this.Y >= Cv.height - this.R)
        {
            this.Y = 2 * (Cv.height - this.R) - this.Y;
            this.dY = forceRange(this.dY * AccEdge, veloc("gm"), veloc("gM"));
        }
    }
}

// Spawn enemies (at higher levels, Extra is used to increase velocity)
function spawn()
{
    switch(Level)
    {
        case 3:
        case 4: Extra += 0.5; break;
    }
    for(var ix = 0; ix < LevelSpawn[Level]; ix++)
        Germs.push(new Germ(false));
}

// Sync canvas and window
function sync()
{
    Cv.width = window.innerWidth;
    Cv.height = window.innerHeight;
    Ctx.clearRect(0, 0, Cv.width, Cv.height);
}

// Reset the game (visually and internally)
function reset()
{
    Cv = $("canvas");
    Ctx = Cv.getContext("2d");

    sync();

    Died = false;
    Scaling = Math.sqrt(Cv.width * Cv.height) / BaseSize;
    Level = 1;
    Kills = 0;
    Extra = 0.0;
    Plr = new Player();
    Germs = [];
    Bolts = [];
    if(BoltTimer != undefined)
        clearInterval(BoltTimer);
    BoltTimer = undefined;

    spawn();
}

// Global draw functionality
function draw()
{
    sync();

    // Draw objects
    for(var bx = 0; bx < Bolts.length; bx++)
        Bolts[bx].draw();
    for(var gx = 0; gx < Germs.length; gx++)
        Germs[gx].draw();
    Plr.draw();

    // Draw top info
    Ctx.font = "20px Monospace";
    Ctx.fillStyle = "white";
    Ctx.textAlign = "left";
    Ctx.fillText("Mouse moves. Left fires. Kills: " + Kills, 2, 20);
//    Ctx.fillText("Mouse moves. Left fires. Wheel accelerates. Kills: " + Kills, 2, 20);

    // Draw level info
    Ctx.fillText(LevelText[Level], 2, Cv.height - 8);

    // Draw end of game if applicable
    if(Died)
    {
        Ctx.font = "30px Monospace";
        Ctx.fillStyle = "white";
        Ctx.textAlign = "center";
        Ctx.fillText("GAME OVER", Cv.width/2, Cv.height/2);
        return;
    }
    if(Germs.length === 0)
    {
        Level++;
        if(Level === LevelMax)
        {
            Ctx.font = "30px Monospace";
            Ctx.fillStyle = "white";
            Ctx.textAlign = "center";
            Ctx.fillText("ALL LEVELS DEFEATED", Cv.width/2, Cv.height/2);
            return;
        }
        spawn();
    }

    // Animate
    window.requestAnimationFrame(draw);
}

// Loop of actions to take each frame
function eachFrame()
{
    Frames++;

    // Delete bolts that are off the map
    for(var bx = 0; bx < Bolts.length; )
    {
        if(Bolts[bx].X < 0 || Bolts[bx].X >= Cv.width ||
           Bolts[bx].Y < 0 || Bolts[bx].Y >= Cv.height)
        {
            Bolts.splice(bx, 1);
            continue;
        }
        bx++;
    }

    // Check for collisions
    for(var gx = 0; gx < Germs.length; )
    {
        var hit = false;
        for(var bx = 0; bx < Bolts.length; bx++)
        {
            //if(Germs[gx].age > BlinkTime &&
            if(touches(Germs[gx].X, Germs[gx].Y, Germs[gx].R,
                       Bolts[bx].X, Bolts[bx].Y, Bolts[bx].R))
            {
                hit = true;
                Kills++;
                Germs.splice(gx, 1);
                Bolts.splice(bx, 1);
                break;
            }
        }
        if( ! hit)
        {
            if(Germs[gx].age > BlinkTime &&
               touches(Plr.X, Plr.Y, Plr.R,
                       Germs[gx].X, Germs[gx].Y, Germs[gx].R))
            {
                Died = true;
                break;
            }
            gx++;
        }
    }

    // Move objects
    for(var bx = 0; bx < Bolts.length; bx++)
        Bolts[bx].move();
    for(var gx = 0; gx < Germs.length; gx++)
        Germs[gx].move();
    Plr.move();
}

// Periodically spawn new enemies
function eachSecond()
{
    Seconds++;
    if( (Level >=  4) ||
        (Level === 3 && Seconds % 2 === 0) ||
        (Level === 2 && Seconds % 4 === 0) )
    {
        Germs.push(new Germ(true));
    }
}

// Player fire weapons functionality
function fire()
{
    Bolts.push(new Bolt());
}

// Event listeners

function mousemove()
{
    MouseX = event.offsetX;
    MouseY = event.offsetY;
}

function mousedown()
{
    Bolts.push(new Bolt());
    if(BoltTimer == undefined)
        BoltTimer = setInterval(fire, RepeatedFireRate);
}

function mouseup()
{
    if(BoltTimer != undefined)
        clearInterval(BoltTimer);
    BoltTimer = undefined;
}

// Uncomment here and below to enable player velocity control
/*
function wheel()
{
    if(event.deltaY != 0)
    {
        if(event.deltaY > 0)
            Plr.vel--;
        else
            Plr.vel++;
        Plr.vel = forceRange(Plr.vel, veloc("pm"), veloc("pM"));
    }
}
*/

// Main method

function main()
{
    document.addEventListener("mousemove", mousemove);
    document.addEventListener("mousedown", mousedown);
    document.addEventListener("mouseup",   mouseup);
//    document.addEventListener("wheel",     wheel);
    reset();
    console.log("Scaling: " + Scaling);
    setInterval(eachSecond, 1000);
    setInterval(eachFrame, 1000/Fps); // crude
    draw();
}

main();
