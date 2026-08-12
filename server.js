const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
const ARENA = { width: 1000, floor: 500, playerWidth: 58, playerHeight: 128 };
const DT = 1 / 60;
const rooms = new Map();

app.use(express.static(path.join(__dirname, 'public')));
app.get('*splat', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

function code() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let value;
  do { value = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''); } while (rooms.has(value));
  return value;
}
function fighter(id, number) {
  return { id, number, x: number === 1 ? 210 : 790, y: 372, vx: 0, vy: 0, hp: 100, facing: number === 1 ? 1 : -1, grounded: true, attacking: false, attackAt: 0, lastAttack: 0, hitDone: false, flashUntil: 0, input: { left: false, right: false } };
}
function view(p) { return { id:p.id,number:p.number,x:+p.x.toFixed(1),y:+p.y.toFixed(1),hp:p.hp,facing:p.facing,attacking:p.attacking,hit:Date.now()<p.flashUntil }; }
function state(room) { io.to(room.code).emit('gameState', { phase:room.phase, countdown:room.countdown, players:[...room.players.values()].map(view) }); }
function reset(room) {
  [...room.players.values()].sort((a,b)=>a.number-b.number).forEach((p,i)=>Object.assign(p,fighter(p.id,i+1)));
  clearInterval(room.timer); room.timer=null; room.phase=room.players.size===2?'countdown':'waiting'; room.countdown=room.players.size===2?3:0;
  if(room.players.size===2){ io.to(room.code).emit('roundReset');io.to(room.code).emit('countdown',3);room.timer=setInterval(()=>{room.countdown--;if(room.countdown>0)io.to(room.code).emit('countdown',room.countdown);else{clearInterval(room.timer);room.timer=null;room.phase='fighting';io.to(room.code).emit('fight')}state(room)},1000) }
  state(room);
}
function join(socket, room, number) {
  socket.join(room.code);socket.data.roomCode=room.code;room.players.set(socket.id,fighter(socket.id,number));
  socket.emit('roomJoined',{roomCode:room.code,playerId:socket.id,playerNumber:number,arena:ARENA});io.to(room.code).emit('playerCount',room.players.size);
  if(room.players.size===2)reset(room);else state(room);
}
function finish(room,winner,loser){if(room.phase!=='fighting')return;room.phase='finished';io.to(room.code).emit('gameOver',{winnerId:winner.id,loserId:loser.id,winnerHp:winner.hp});state(room)}

io.on('connection',socket=>{
  function leaveCurrentRoom(){const room=rooms.get(socket.data.roomCode);if(!room)return;room.players.delete(socket.id);socket.leave(room.code);delete socket.data.roomCode;clearInterval(room.timer);room.timer=null;if(!room.players.size){rooms.delete(room.code);return}const remaining=[...room.players.values()][0];Object.assign(remaining,fighter(remaining.id,1));room.phase='waiting';room.countdown=0;io.to(room.code).emit('opponentLeft');io.to(room.code).emit('playerCount',1);state(room)}
  socket.on('createRoom',()=>{
    if(socket.data.roomCode)return;const room={code:code(),players:new Map(),phase:'waiting',countdown:0,timer:null};rooms.set(room.code,room);join(socket,room,1);
  });
  socket.on('joinRoom',raw=>{
    if(socket.data.roomCode)return;const roomCode=String(raw||'').trim().toUpperCase();const room=rooms.get(roomCode);
    if(!room)return socket.emit('roomError','존재하지 않는 방 코드입니다.');
    if(room.players.size>=2)return socket.emit('roomError','방이 가득 찼습니다.');
    join(socket,room,2);
  });
  socket.on('playerInput',input=>{const room=rooms.get(socket.data.roomCode),p=room?.players.get(socket.id);if(p){p.input.left=!!input?.left;p.input.right=!!input?.right}});
  socket.on('jump',()=>{const room=rooms.get(socket.data.roomCode),p=room?.players.get(socket.id);if(p&&room.phase==='fighting'&&p.grounded){p.vy=-620;p.grounded=false}});
  socket.on('punch',()=>{const room=rooms.get(socket.data.roomCode),p=room?.players.get(socket.id),now=Date.now();if(p&&room.phase==='fighting'&&!p.attacking&&now-p.lastAttack>=480){p.attacking=true;p.attackAt=now;p.lastAttack=now;p.hitDone=false}});
  socket.on('restartGame',()=>{const room=rooms.get(socket.data.roomCode);if(room?.players.size===2&&room.phase==='finished')reset(room)});
  socket.on('leaveRoom',leaveCurrentRoom);
  socket.on('disconnect',leaveCurrentRoom);
});

setInterval(()=>{for(const room of rooms.values()){if(room.phase!=='fighting'){state(room);continue}const list=[...room.players.values()];if(list.length!==2)continue;const now=Date.now();for(const p of list){const other=list.find(x=>x.id!==p.id);p.facing=other.x>=p.x?1:-1;p.vx=(Number(p.input.right)-Number(p.input.left))*250;p.vy+=1500*DT;p.x+=p.vx*DT;p.y+=p.vy*DT;p.x=Math.max(29,Math.min(971,p.x));if(p.y>=372){p.y=372;p.vy=0;p.grounded=true}if(p.attacking){const elapsed=now-p.attackAt;if(!p.hitDone&&elapsed>=90&&elapsed<=230){const dx=other.x-p.x;if(Math.sign(dx)===p.facing&&Math.abs(dx)<=105&&Math.abs(other.y-p.y)<=75){p.hitDone=true;other.hp=Math.max(0,other.hp-10);other.x=Math.max(29,Math.min(971,other.x+p.facing*28));other.flashUntil=now+180;io.to(room.code).emit('hitLanded');if(!other.hp)finish(room,p,other)}}if(elapsed>=300)p.attacking=false}}
    const gap=list[1].x-list[0].x;if(Math.abs(gap)<48){const fix=(48-Math.abs(gap))/2,sign=gap>=0?1:-1;list[0].x-=fix*sign;list[1].x+=fix*sign}state(room)}},1000/60);

server.listen(PORT,'0.0.0.0',()=>console.log(`1 VS 1 FIGHT running on port ${PORT}`));
