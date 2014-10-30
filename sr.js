
var game = {
  'Players': [{},{},{},{},{}],
}

var game_cfg = {
   "start_money": [-1,0,0,40,30,24],
   "stations": 7,
   "passengers": 9,
   "track": 60,
   "shares": 16,
   "companies": [
      ["grey",  [20,8], 'grey'],
      ["purple",[15,0], 'purple'],
      ["red",   [13,2], 'red'],
      ["blue",  [16,14],'blue'],
      ["green", [4,0],  'green'],
      ["orange",[3,5],  'orange'],
      ["yellow",[9,15], 'yellow']
   ],
   "goods": [
      [[7,2],  ['g','g','t'], 'pink'],
      [[11,3], ['g','g','b'], 'grey'],
      [[16,3], ['t','t','b'], 'white'],
      [[6,6],  ['b','b','g'], 'beige'],
      [[17,6], ['g','g','s'], 'olive'],
      [[11,7], ['s','s','b'], 'green'],
      [[6,8],  ['s','s','t'], 'yellow'],
      [[15,8], ['t','t','s'], 'tan'],
      [[5,10], ['s','s','g'], 'lime'],
      [[8,10], ['b','b','t'], 'magenta'],
      [[11,11],['t','t','g'], 'brown'],
      [[13,12],['b','b','s'], 'teal']
   ],
   "map": [
"  p p p pt    p p p p p p p p pt",
",p p p p p   p p p p p p p p p p ",
"p p p p p p pcp p p p p ptp p p p ",
",p p p ptp p p p p pcp p p p pcp ",
"  p p p p p p p p p p p p p p p pt",
",ptp p p p ptp p p p p ptp p p p ",
"  p p pcp p p p p ptp p p p pcp p ",
",p p p p p p p pcp p p p p p p p ",
"  p pcp p ptp p p p p pcp p p p pt",
",p p p p p p p p p p p p p ptp p ",
"pcp p pcp p p p p ptp p p p p p ",
",p p p p p pcp p p p p p p p ",
"p p ptp p p p pcp p p ",
",p p p   p p p p p p p ",
"  p p     p p p p ptp p ",
",  pt      p p p p p p ",
"              p p p p "
]
};

var game_log = [];

function start_action(order)
{
   game_cmd_send("start:"+order.join(':'));
   start_cmd(order);
}

function start_cmd(order)
{
   var log_entry = {'action':'start', 'order':order };
   game_log.push(log_entry);
   do_start(order)
}

function place_train_action(player, bid, company, x,y)
{
   game_cmd_send('train:'+player+':'+bid+':'+company+':'+x+':'+y);
   place_train_cmd(player, bid, company, x,y);
}
function place_train_cmd(player, bid, company, x,y)
{
   /// XXX Fix from/last
   var log_entry = {'action':'train', 'company':company, 'player':player, 'bid':bid, 'to':[x,y], 'from':[x,y], 'last':[x,y] };
   game_log.push(log_entry);
   do_move_train(player, bid, company, x,y);
}

function remove_station_action(player, x,y)
{
   game_cmd_send('rem_station:'+player+':'+x+':'+y);
   remove_station_cmd(player, x,y);
}

function remove_station_cmd(player, x,y)
{
   var log_entry = {'action':'rem_station', 'player':player, 'station':[x,y] };
   game_log.push(log_entry);
   do_remove_station(player, x,y);
}

function place_station_action(player, x,y)
{
   game_cmd_send('add_station:'+player+':'+x+':'+y);
   place_station_cmd(player, x,y);
}

function place_station_cmd(player, x,y)
{
   var log_entry = {'action':'add_station', 'player':player, 'station':[x,y] };
   game_log.push(log_entry);

   do_place_station(player, x,y);
}

function take_good_action(player, town, good)
{
   game_cmd_send('good:'+player+':'+town+':'+good);
   take_good_cmd(player, town, good);
}

function take_good_cmd(player, town, good)
{
   var log_entry = {'action':'good', 'player':player, 'town':town, 'good':good };
   game_log.push(log_entry);
   do_move_good(player, town, good, true);
}

function force_close_action(company)
{
   game_cmd_send('close:'+company);
   force_close_cmd(company);
}

function force_close_cmd(company)
{
   var log_entry = {'action':'close', 'company':company };
   game_log.push(log_entry);
   force_close(close, true);
}


function next_action() {
    if(game.end) {
       game_cmd_send("end");
       end();
    }
    if (game.actions == 0) {
       next_player();
    }
    game.actions -= 1;
}

function next_player() {
    p = game.player_order.indexOf(game.player_idx)
    p += 1;
    if (p == game.max_player) {
        p = 0;
    }
    game.player_idx = game.player_order[p];
    next_turn();
}

function next_turn() {
   update_active_player_ui();
   game.moved = undefined;
   game.valid = [];
   show_valid();
   game.actions = 2;
}

function  do_move_good(player, town, good, undo)
{
      // take good.
      if (game.Players[game.player_idx].tokens[town] == undefined) {
         game.Players[game.player_idx].tokens[town] = '';
      }
      if (game.Players[game.player_idx].goods[good] == undefined) {
         game.Players[game.player_idx].goods[good] = 0;
      }
      game.Players[game.player_idx].tokens[town] += good
      game.Players[game.player_idx].goods[good] += 1; 
      update_p_token_ui(game.Players[game.player_idx]);
      good_remove_ui(town, good);
      next_action();
}

function train_options(company)
{
      var c = game.companies[company];

      var x = c.train[0];
      var y = c.train[1];

      // Get list of possible moves.
      var move_to;
      if (c.train[0] - c.last[0] == -1 && c.train[1] - c.last[1] == -1) {
         move_to = [[x,y-1],[x-1,y-1],[x-1,y]];
      }
      if (c.train[0] - c.last[0] == -1 && c.train[1] - c.last[1] == 0) {
         move_to = [[x,y+1],[x-1,y],[x-1,y-1]];
      }
      if (c.train[0] - c.last[0] == 0  && c.train[1] - c.last[1] == -1) {
         move_to = [[x-1,y-1], [x,y-1], [x+1,y]];
      }
      if (c.train[0] - c.last[0] == 0  && c.train[1] - c.last[1] == 1) {
         move_to = [[x-1,y], [x,y+1], [x+1,y+1]];
      }
      if (c.train[0] - c.last[0] == 1  && c.train[1] - c.last[1] == 0) {
         move_to = [[x,y-1], [x+1,y], [x+1,y+1]];
      }
      if (c.train[0] - c.last[0] == 1  && c.train[1] - c.last[1] == 1) {
         move_to = [[x,y+1], [x+1,y], [x+1,y+1]];
      }
      if (c.train[0] - c.last[0] == 0  && c.train[1] - c.last[1] == 0) {
         // Starting position
         move_to = [[x-1,y-1], [x-1,y], [x,y-1], [x,y+1], [x+1,y], [x+1,y+1]];
      }
      // Test for emptyness
      var empty = []
      move_to.forEach(function(l) {
         // Test for train allowed to enter
          var x = l[0];
          var y = l[1];
          if (!( x+'_'+y in game.loc)) {
             return;
          }
          if (game.loc[x+'_'+y][0] == undefined || game.loc[x+'_'+y][0] == 's') {
             empty.push(l);
          }
      });
      // Test for validity
      var valid = [];
      empty.forEach(function(l) {
         var merge = undefined;
         var touch = [];
         var x = l[0];
         var y = l[1];
         [[x-1,y-1], [x-1,y], [x,y-1],
         [x,y+1], [x+1,y], [x+1,y+1]].forEach(function (test) {
            // Check for merge and multiple merge (multi not valid)
            var loc = game.loc[test[0]+'_'+test[1]];
            if (loc && loc[0] == 'c') {
               touch.push(test);
            }
            if (loc && loc[0] == 't') {
               touch.push(test);
            }
            if (loc && (loc[0] == 'r' || loc[0] == 'T')) {
               if (c.name == loc[1]) {
                  return;
               }
               if (merge && merge != loc[1]) {
                  merge = 'xxx';
                  return; // Not good more than one merge
               }
               merge = loc[1];
            }
         });
         if (merge == 'xxx') {
            return;
         }
         valid.push([x,y,merge, touch]);
      });
      return valid;
}

function select_train(x,y,company) {
      var c = game.companies[company];
      if (c.train[0] != x || c.train[1] != y) {
         return false;
      }
      if (game.veto) {
         // Already bidding.
         return true;
      }
      if (game.moved == company) {
         // Only move a train once per turn.
         return true;
      }
      if (game.moving == company) {
         // Click train again, cancel move.
         game.moving = undefined;
         game.valid = [];
         show_valid();
         return true;
      }
      game.moving = company;

      game.valid = train_options(company);
      if (game.valid == []) {
         return false;
      }
      show_valid();
      return true;
}

/* Either veto == undefined: not bidding for position, so start bidding or just move
   or veto != undefined, in process of bidding, check player vs idx to see if it is a re-position
   */
function do_move_train(player, bid, company, x,y)
{
   game.companies[company].train = [x,y];
   if( game.new_bid > 0) {
      game.bid = game.new_bid;
      game.veto_winner = player;
      game.new_bid = undefined;
   }
   move_head(company, x, y);
   if (game.veto == player) {
      veto_next();
      return;
   }
   game.moving = company;
   game.bid = 0;
   game.veto = player;
   game.veto_winner = player;
   game.veto_end = undefined;
   take_share(player, company, false)
   update_message('Moving '+company, true);

   if (game.valid.length == 1) {
      veto_done(company);
   } else {
      veto_next();
   }
}

function veto_next() {
   auction_ui(true);
   while(1) {
       var p;
       p = game.player_order.indexOf(game.veto)
       p += 1;
       if (p == game.max_player) {
           p = 0;
       }
       game.veto = game.player_order[p]
       if (game.veto_end == game.veto ||     // End of round or...
           (game.veto_end != undefined && game.veto == game.veto_winner) // no one else can vote
          )
       {
          veto_done(game.moving);
          return;
       }
       if (game.veto_end == undefined) {
          // Remember this so we give the current player one last chance to veto.
          game.veto_end = game.veto;
       }
       if (game.Players[game.veto].shares[game.moving] > game.bid ||
          (game.Players[game.veto].shares[game.moving] == game.bid && game.veto == game.player_idx)) {
          update_auction_ui();
          return;
       }
   }
}
function veto_done(name) {
   var loc = game.companies[name].train;
   auction_ui(false);

   var at_loc = game.loc[loc[0]+'_'+loc[1]];
   game.moved = name;
   game.veto = undefined;
   final_move_head(name);
   if (game.bid) {
      update_message(game.Players[game.veto_winner].name+' paying '+game.bid+' shares', false);
   }
   while(game.bid) {
      game.bid -= 1;
      return_share(name, game.veto_winner);
   }
   if (at_loc && at_loc[0] == 's') {
      //Touched a station, remember it, and maybe give a passanger.
      var owner = +at_loc[1];
      game.companies[name].stations[owner] += 1;
      if (owner != game.veto_winner && game.veto_winner == game.player_idx) { // If it is not my station AND I decided to go here.
         if (game.passengers > 0) {
            game.Players[game.player_idx].goods['p'] = (game.Players[game.player_idx].goods['p'] || 0) + 1;
            game.passengers -= 1;
            update_p_token_ui(game.Players[game.player_idx]);
         }
      }
      update_c_station_ui(game.companies[game.moving]);
   }
   // Touched something
   if (game.move_target[3] != []) {
      var unique = [];
      game.move_target[3].forEach(function(loc){
         var loc_str = loc[0]+'_'+loc[1];

         if (game.companies[game.moving].touches.indexOf(loc_str) == -1) {
            game.companies[game.moving].touches.push(loc_str);
            update_c_touches_ui(game.companies[game.moving]);
            unique.push(loc);
         }
      });

      unique.forEach(function (loc) {
         var at_loc = game.loc[loc[0]+'_'+loc[1]];

         if (at_loc[0] == 't') {
            pay_town(game.moving, 'stations');
         }
         if (at_loc[0] == 'c') {
            pay_city(at_loc[1], 'tokens', 2);
         }
      });
   }

   // Merging
   if (game.move_target[2] != undefined) {
      // Merge happened to [2]
      update_message('Merging '+game.companies[game.moving].name+' into '+game.companies[game.move_target[2]].name,false);
      pay_town(game.moving, 'holders');
      game.companies[game.moving].track.forEach(function(t) {
         own_track(t.split('_'), game.move_target[2]);
      });
      for(var p = 0; p < game.companies[game.moving].holders.length; p++)
      {
         update_message(game.Players[p].name+' trading '+game.Players[p].shares[game.moving]+' for '+Math.floor(game.Players[p].shares[game.moving]/2)+' of '+game.companies[game.move_target[2]].name);
         for(var i = game.Players[p].shares[game.moving]; i >= 2; i-=2) {
            take_share(p, game.move_target[2], true);
         }
         game.Players[p].shares[game.moving] = 0;
         update_p_stock_ui(game.Players[p]);
      };
      game.companies[game.moving].holders = [];
      for (var p = 0; p < game.max_player; p++) {
         game.companies[game.move_target[2]].stations[p] += game.companies[game.moving].stations[p];
         game.companies[game.moving].stations[p] = 0;
      }

      game.companies[game.move_target[2]].touches = game.companies[game.move_target[2]].touches.concat(game.companies[game.moving].touches);
      update_c_station_ui(game.companies[game.moving]);
      update_c_touches_ui(game.companies[game.moving]);
      isolate(game.moving);
      update_c_stock_ui(game.companies[game.moving]);
      update_c_station_ui(game.companies[game.move_target[2]]);
      update_c_touches_ui(game.companies[game.move_target[2]]);
      $('#'+game.companies[game.moving].name+'_train').remove();
      // Replace the train with track.
      own_track(game.companies[game.moving].train, game.move_target[2]);
   }
   var co_count = 0;
   for (var c in game.companies) {
      if (!game.companies.hasOwnProperty(c)) {
         continue;
      }
      if (game.companies[c].shares > 0) {
         co_count += 1;
      }
   }
   if (co_count == 1) {
      game.end = true;
   }
   game.moving = undefined;
   next_action();
}

function final_move_head(name)
{
   game.companies[name].last = game.companies[name].from
   own_track(game.companies[name].last, name);
   game.companies[name].from = game.companies[name].train
   loc = game.companies[name].train;
   game.valid = [];
   show_valid();
   if(game.loc[loc[0]+'_'+loc[1]][0] == 't') {
      // starting location, skip.
      return;
   }
   game.loc[loc[0]+'_'+loc[1]] = ['T',name];
   update_message('', true);
}
function own_track(loc, name)
{
   if(game.loc[loc[0]+'_'+loc[1]][0] == 't') {
      // starting location, skip.
      return;
   }
   game.companies[name].track.push(loc[0]+'_'+loc[1]);
   if (game.loc[loc[0]+'_'+loc[1]][0] != 'r') {
      game.track -= 1;
   }
   game.loc[loc[0]+'_'+loc[1]] = ['r',name];
   update_track_ui();
   if (game.track == 0) {
      game.end = true;
   }
   track_ui(name, loc[0], loc[1]);
}

function take_share(p, c, overdraft)
{
   if (game.companies[c].shares <= 0 && !overdraft) {
      return;
   }
   game.companies[c].shares -= 1;
   game.companies[c].holders[p] += 1;
   game.Players[p].shares[c] += 1;
   update_c_stock_ui(game.companies[c]);
   update_p_stock_ui(game.Players[p]);
}
function return_share(c, p)
{
   if (game.companies[c].shares == 0) {
      return;
   }
   game.companies[c].shares += 1;
   game.companies[c].holders[p] -= 1;
   game.Players[p].shares[c] -= 1;
   update_c_stock_ui(game.companies[c]);
   update_p_stock_ui(game.Players[p]);
}

function do_place_station(player, x,y)
{
   if(game.Players[player].stations == 0) {
      return false;
   }
   game.Players[player].stations -= 1;
   game.loc[x+'_'+y] = ['s', player];
   place_station_ui(player, x, y);
   update_p_station_ui(game.Players[player]);
   next_action();
}

function do_remove_station(player, x,y)
{
   if(game.loc[x+'_'+y] != ['s', player]) {
      return false;
   }
   game.Players[player].stations += 1;
   game.loc[x+'_'+y] = undefined;
   remove_station_ui(player, x, y);
   update_p_station_ui(game.Players[player]);
}

function pay_town(c,count) {
   // Count stations, pays out 1/touch to first and .5/touch to second. Ties share
   var most = 0;
   var most_p = [];
   var next = 0;
   var next_p = [];
   for (var p = 0; p < game.max_player; p++) {
      if (game.companies[c][count][p] > most) {
         next = most;
         next_p = most_p;
         most = game.companies[c][count][p];
         most_p = [];
         // Fall thru into next if.
      }
      if (game.companies[c][count][p] == most) {
         most_p.push(p);
         continue;
      }
      if (game.companies[c][count][p] > next) {
         next = game.companies[c][count][p];
         next_p = [];
         // Fall thru into next if.
      }
      if (game.companies[c][count][p] == next) {
         next_p.push(p);
         continue;
      }
   }
   if (most == 0) {
      return;
   }
   if (most_p.length == 1) {
      game.Players[most_p[0]].money += game.companies[c].touches.length;
      update_p_money_ui(game.Players[most_p[0]]);
      update_message('Pay '+game.Players[most_p[0]].name+' $'+game.companies[c].touches.length,false);
   } else if (most_p.length > 0) {
      next = 0; // Tie for first means no second.
      var total = game.companies[c].touches.length * 1.5;
      for( var p in most_p) {
         if (!game.Players.hasOwnProperty(p)) {
            continue;
         }
         game.Players[p].money += Math.floor(total/most_p.length);
         update_p_money_ui(game.Players[p]);
         update_message('Pay '+game.Players[p].name+' $'+Math.floor(total/most_p.length),false);
      }
   }
   if (next == 0) {
      return;
   }
   if (next_p.length == 1) {
      game.Players[next_p[0]].money += Math.floor(game.companies[c].touches.length*0.5);
      update_p_money_ui(game.Players[next_p[0]]);
      update_message('Pay '+game.Players[next_p[0]].name+' $'+Math.floor(game.companies[c].touches.length*0.5),false);
   } else if (next_p.length > 0) {
      var total = game.companies[c].touches.length * 0.5;
      for( var p in next_p) {
         if (!game.Players.hasOwnProperty(p)) {
            continue;
         }
         game.Players[p].money += Math.floor(total/next_p.length);
         update_p_money_ui(game.Players[p]);
         update_message('Pay '+game.Players[p].name+' $'+Math.floor(total/next_p.length),false);
      }
   }
}
function pay_city(t, count, price) {
   // Count tokens, pays out 2(6) to first and 1(3) to second. Ties share
   var most = 0;
   var most_p = [];
   var next = 0;
   var next_p = [];
   for (var p = 0; p < game.max_player; p++) {
      var val = game.Players[p][count][t];
      if (val && count == 'tokens') {
         val = val.length;
      }
      if (val > most) {
         next = most;
         next_p = most_p;
         most = val;
         most_p = [];
         // Fall thru into next if.
      }
      if (val == most) {
         most_p.push(p);
         continue;
      }
      if (val > next) {
         next = val;
         next_p = [];
         // Fall thru into next if.
      }
      if (val == next) {
         next_p.push(p);
         continue;
      }
   }
   if (most == 0) {
      return;
   }
   if (most_p.length == 1) {
      game.Players[most_p[0]].money += price
      update_p_money_ui(game.Players[most_p[0]]);
      update_message('Pay '+game.Players[most_p[0]].name+' $'+price,false);
   } else if (most_p.length > 0) {
      next = 0; // Tie for first means no second.
      for( var p in most_p) {
         if (!game.Players.hasOwnProperty(p)) {
            continue;
         }
         game.Players[p].money += Math.floor((price*1.5)/most_p.length);
         update_p_money_ui(game.Players[p]);
         update_message('Pay '+game.Players[p].name+' $'+Math.floor((price*1.5)/most_p.length),false);
      }
   }
   if (next == 0) {
      return;
   }
   if (next_p.length == 1) {
      game.Players[next_p[0]].money += price*0.5
      update_p_money_ui(game.Players[next_p[0]]);
      update_message('Pay '+game.Players[next_p[0]].name+' $'+Math.floor(price*0.5),false);
   } else if (next_p.length > 0) {
      for( var p in next_p) {
         if (!game.Players.hasOwnProperty(p)) {
            continue;
         }
         game.Players[p].money += Math.floor(price*0.5/next_p.length);
         update_p_money_ui(game.Players[p]);
         update_message('Pay '+game.Players[p].name+' $'+Math.floor(price*0.5/next_p.length),false);
      }
   }
}

// Multi screen interface
function game_cmd(c, data)
{
   var cmd = data.split(':');

   if (cmd[0] == 'log') {
      if (game_log.length > cmd[1]) {
         if (log_to_string(cmd[1]) != cmd.slice(2).join(':')) {
            alert('Log mismatch, local: #'+cmd[1]+': '+log_to_string(cmd[1])+'\n'+c.peer+': '+cmd.slice(2).join(':'));
         }
         return;
      } else if (game_log.length == cmd[1]) {
         // Do not have this entry, parse it as external command
         cmd.shift();
         cmd.shift();
      } else {
         // Far future, just drop it.
         return;
      }
   }

   if (cmd[0] == 'player') {
      var ap = document.getElementById("p"+cmd[1]+"_name");
      ap.value = cmd[2];
      var ap = document.getElementById("p"+cmd[1]+"_peer");
      ap.innerText = cmd[3]
      game.Players[+cmd[1]].peer = c.peer;
      var log_entry = {'action':'player', 'slot':cmd[1], 'name':cmd[2], 'peer':cmd[3] };
      game_log.push(log_entry);
   }
   if (cmd[0] == 'add_station') {
      place_station_cmd(cmd[1],cmd[2], cmd[3]);
   } else if (cmd[0] == 'rem_station') {
      remove_station_cmd(cmd[1],cmd[2], cmd[3]);
   } else if (cmd[0] == 'train') {
      place_train_cmd(cmd[1],cmd[2], cmd[3], cmd[4], cmd[5]);
   } else if (cmd[0] == 'good') {
      take_good_cmd(cmd[1], cmd[2], cmd[3]);
   } else if (cmd[0] == 'close') {
      force_close_cmd(cmd[1]);
   } else if (cmd[0] == 'start') {
      start_cmd(cmd.slice(1));
   } else if (cmd[0] == 'peers') {
      send_log();
   } else if (cmd[0] == 'end') {
      end();
   }
}


function send_log()
{
   for (var i = 0; i < game_log.length; i++) {
      var cmd='log:'+i+':';

      cmd += log_to_string(i);
      game_cmd_send(cmd);
   }
}

function save_log()
{
   var cmd='';
   for (var i = 0; i < game_log.length; i++) {

      cmd += log_to_string(i)+'\n';
   }
   document.location.href = 'data:application/binary;charset=UTF-8,'+encodeURIComponent(cmd)
}

function log_to_string(i)
{
      var e = game_log[i];
      var cmd;

      cmd = e['action']+':';
      if (e['action'] == 'start') {
         cmd+= e['order'];
      } else if (e['action'] == 'train') {
         cmd+= e['player']+':';
         cmd+= e['bid']+':';
         cmd+= e['company']+':';
         cmd+= e['to'][0]+':';
         cmd+= e['to'][1];
      } else if (e['action'] == 'rem_station') {
         cmd+= e['player']+':';
         cmd+= e['town']+':';
         cmd+= e['good'];
      } else if (e['action'] == 'add_station') {
         cmd+= e['player']+':';
         cmd+= e['station'][0]+':';
         cmd+= e['station'][1];
      } else if (e['action'] == 'good') {
         cmd+= e['player']+':';
         cmd+= e['good'][0]+':';
         cmd+= e['good'][1];
      } else if (e['action'] == 'close') {
         cmd+= e['company'];
      } else if (e['action'] == 'player') {
         cmd+= e['slot']+':';
         cmd+= e['name']+':';
         cmd+= e['peer'];
      }
      return cmd
}
// This screen interface

// User action handlers
function update_name(p)
{
   var ap = document.getElementById("p"+p+"_name");
   var log_entry = {'action':'player', 'slot':p, 'name':ap.value, 'peer':$('#pid').text() };
   game_log.push(log_entry);
   game_cmd_send("player:"+p+":"+ ap.value+':'+$('#pid').text());
}

function start()
{
   order = [0,1,2,3].shuffle();

   start_action(order);
}

function bid_pass() {
   game.new_bid = undefined;
   place_train_action(game.veto, -1, game.moving,game.companies[game.moving].train[0],game.companies[game.moving].train[1]);
}

function bid() {
   var b = $('#bid').val();
   b = Math.min(b,game.Players[game.veto].shares[game.moving]);
   if (b > game.bid || (b == game.bid && game.veto == game.player_idx)) {
      // Just update UI to show train as unmoved, to let player move it again.
      move_head(game.moving,game.companies[game.moving].from[0],game.companies[game.moving].from[1]);
      game.new_bid = b;
   }
}
function clickhex(h)
{
   var loc;
   var e;

   if (game.end) {
      return;
   }
   e = $(h.srcElement);
   if (e.hasClass('goods')) {
      take_good_action(game.player_idx, e.attr('town'), e.attr('good'));
      return;
   }
   while (!e.hasClass('middle') && !e.hasClass('hex')) {
      e = e.parent();
   }
   if (!e.hasClass('middle')) {
      return;
   }
   if (e.attr('land') == ' ') {
      return;
   }
   loc = e.parent().attr('id').split('_');
   var did_something = false;
   var x = +loc[0];
   var y = +loc[1];
   var cell = game.loc[x+'_'+y];
   game.co_list.forEach(function (company) {
      did_something |= select_train(x,y,company);
   });

   if (did_something) {
      return;
   }
   game.valid.forEach(function (l) {
      if (x == l[0] && y == l[1]) {
         game.move_target = l;
         if (game.veto == undefined || game.new_bid != undefined) {
            place_train_action(game.veto || game.player_idx, $('#bid').val(), game.moving, x, y);
            did_something = true;
         }
      }
   });

   // done something already or in process of moving a train, don't need to consider any more options.
   if (did_something || game.moving) {
      return;
   }
   var train;
   var station;
   [[x-1,y-1],
    [x-1,y],
    [x,y-1],
    [x,y+1],
    [x+1,y],
    [x+1,y+1]].forEach(function(l) {
       if (train || station) {
          return;
       }
       var x = l[0];
       var y = l[1];
       var loc = game.loc[x+'_'+y];
       if (loc == undefined) {
          return;
       }
       if (loc[0] == 'T') {
          train = loc[1];
       }
       if (loc[0] == 's') {
          station = loc[1]
       }
   });
   if (cell[0] == undefined && !((train != undefined)|| (station != undefined))) {
      place_station_action(game.player_idx, x, y);
   }
}

// User visible changes to game state

function update_message(m, clear)
{
   if (clear) {
      $('#message').empty();
   }
   $('#message').append($('<div/>',{text:m}));
}

function auction_ui(show)
{
   if (show) {
      $('#auction').show();
   } else {
      $('#auction').hide();
   }
}

function update_auction_ui()
{
   $('#bid_co').html(game.companies[game.moving].name);
   $('#bidder').html(game.Players[game.veto].name);
   $('#bid').val(game.bid);
   $('#h_bidder').html(game.Players[game.veto_winner].name);
   $('#h_bid').html(game.bid);
}
function update_p_stock_ui(p)
{
  var h = $('#p'+p.idx+'_shares');

  h.empty();
  for(var c in p.shares) {
    var l;
    if (! (p.shares[c] > 0)) { continue; }
    l = $('<div/>', {html: game.companies[c].name+': '+p.shares[c]});
    h.append(l);
  }
}
function update_active_player_ui(p)
{
   var ap = document.getElementById("active_player");
   ap.innerText = game.Players[game.player_idx].name;
}
function update_p_station_ui(p)
{
  var h = $('#p'+p.idx+'_stations');
  h.html(p.stations);
}
function place_station_ui(player, x, y)
{
   $('#'+x+'_'+y+" .middle").append($('<span/>', {"class":'p'+player+' station', html:"S"}));
}
function remove_station_ui(player, x, y)
{
   $('#'+x+'_'+y+" .middle .station").remove();
}
function update_p_money_ui(p)
{
  var h = $('#p'+p.idx+'_money');
  h.html(p.money);
}
function update_p_token_ui(p)
{
  var h = $('#p'+p.idx+'_goods');
  h.empty();
  var c;
  c = $('<div/>')
  for (var good in p.goods) {
   if (!p.goods.hasOwnProperty(good)) {
      continue;
   }
   c.append($("<span/>", {html: good+': '+p.goods[good]+' '}));
  }
  h.append(c);
  c = $('<div/>')
  for (var loc in p.tokens) {
   if (!p.tokens.hasOwnProperty(loc)) {
      continue;
   }
   c.append($("<span/>", {style:'background: '+loc,html: p.tokens[loc]+' '}));
  }
  h.append(c);
}
function update_c_stock_ui(c)
{
  var h = $('#'+c.name+'_holders');

  h.empty();
  for(var p in c.holders) {
    var l;
    if (! (c.holders[p] > 0)) { continue; }
    l = $('<div/>', {html: game.Players[p].name+': '+c.holders[p]});
    h.append(l);
  }
  h = $('#'+c.name+'_shares');
  h.html(c.shares);
}
function update_c_station_ui(c)
{
  var h = $('#'+c.name+'_stations');

  h.empty();
  for(var p in c.stations) {
    var l;
    if (! (c.stations[p] > 0)) { continue; }
    l = $('<div/>', {html: game.Players[p].name+': '+c.stations[p]});
    h.append(l);
  }
  h = $('#'+c.name+'_shares');
  h.html(c.shares);
}
function update_c_touches_ui(c)
{
  h = $('#'+c.name+'_touches');
  h.html(c.touches.length);
}
function update_track_ui(c)
{
  h = $('#track');
  h.html(game.track);
}

function track_ui(company, x, y)
{
   $('#'+x+'_'+y+' .middle .track').remove()
   $('#'+x+'_'+y+" .middle").append($('<span/>', {"class":game.companies[company].color+' track', html:"&nbsp;"}));
}

function move_head(name, x,y) {
   $('#'+x+'_'+y+" .middle").append($('#'+name+'_train'));
}

function show_valid()
{
   $('.valid').removeClass('valid');
   game.valid.forEach(function (l) {
      $('#'+l[0]+'_'+l[1]+" .middle").addClass('valid');
   });
}

function good_remove_ui(town, good)
{
   $('[town="'+town+'"][good="'+good+'"]')[0].remove();
}

function do_start(player_order)
{
   /* Has game logic in here, but basically inseperable from UI based information */
   var map = $('#map');
   var table;
   var x,y;
   var start_col;

   $('#start').hide();
   x = 0; y = 0;
   start_col = 0;
   game.loc = {};
   game.valid = [];
   show_valid();
   game.track = game_cfg.track;
   game.passengers = game_cfg.passengers;
   game_cfg.map.forEach(function (l) {
      var col = $("<div>", { "class":"hex-row"});
      map.append(col);
      if (l.charAt(0) == ",") {
         l = l.slice(1);
         col.addClass("even");
         start_col += 1;
      }
      x = start_col;
      var out = l.match(/.{1,2}/g);
      out.forEach(function(c) {
         var wrapper = $("<div>",{id:x+"_"+y, "class":"hex"});
         var cell = $("<div>",{"class":"top", land:c.charAt(0), city:c.charAt(1)});
         wrapper.append(cell);
         cell = $("<div>",{"class":"middle", land:c.charAt(0), city:c.charAt(1)});
         if (c.charAt(1) != " ") {
            cell.append($("<span/>"));
         }
         if (c.charAt(0) != " ") {
            game.loc[x+'_'+y] = [c.charAt(1) != ' '?c.charAt(1):undefined];
         }
         wrapper.append(cell);
         cell = $("<div>",{"class":"bottom", land:c.charAt(0), city:c.charAt(1)});
         wrapper.append(cell);
         col.append(wrapper);
         x += 1;
      });
      y += 1;
   });
   $('#map').click(clickhex)

    var tbl = document.getElementById('Players');
    var rows = tbl.getElementsByTagName('tr');
    var r;
    game.Players = [{},{},{},{}]
    game.max_player = 0;
    for(var i=0; i < 4; i++) {
        game.Players[i].shares = [];
        game.Players[i].tokens = [];
        game.Players[i].goods = [];
        game.Players[i].money = 0;
        var ap = document.getElementById("p"+i+"_name");
        if (ap.value == '') {
            var ap = document.getElementById("p"+i);
            ap.hidden = true;
            for(var o=0; o < 4; o++) {
               if (player_order[o] == i) {
                  player_order.splice(o,1);
                  break;
               }
            }
        } else {
            game.Players[i].idx=i;
            game.Players[i].row=rows[i+1];
            game.Players[i].name=ap.value;
            game.Players[i].stations = game_cfg.stations;
            game.max_player++;
        }
       update_p_station_ui(game.Players[i]);
    }

    game.player_order = player_order;
    // Show Players in turn order
    var after = rows[0];
    for(var i=0; i< game.max_player; i++) {
        var prow;
        prow=game.Players[game.player_order[i]].row;
        after.parentNode.insertBefore(prow.parentNode.removeChild(prow), after.nextSibling);
        after=prow;
    }

   game_cfg.goods.forEach(function (l) {
      var loc = l[0];
      var goods = l[1];
      var color = l[2];

      var row = $('#'+loc[0]+'_'+loc[1]+' .middle');
         row.append($("<span/>", {html:'&nbsp;', style:'background:'+color+';'}));
      for(var i = 0; i < 3; i++) {
         row.append($("<span/>", {html:'&nbsp;'+goods[i]+'&nbsp;', 'class':'goods', 'town':color, 'good':goods[i], 'id': loc[0]+'_'+loc[1]+'_g'+i, style:'background:'+color+';'}));
      }
      game.loc[loc[0]+'_'+loc[1]] = ['c',color];
   });
   table = $('#companies');
   table.show();
   game.companies = {};
   game.co_list = [];
   game.city = {}
   game_cfg.companies.forEach(function (l) {
      var name = l[0];
      var loc = l[1];
      var x = loc[0];
      var y = loc[1];
      var color = l[2];

      var row;
      var cell;

      var company = {'name':name,
                     'shares':16,
                     'color':color,
                     'holders':[],
                     'stations':[],
                     'track':[],
                     'touches':[],
                     };
      game.companies[name] = company;
      game.co_list.push(name);
      game.companies[name].train = [x,y];

      row = $("<tr>");
      cell = $("<td/>", {text:name, style:'background:'+color+';'});
      row.append(cell);
      cell = $("<td/>", {id:name+'_shares', text:company.shares});
      row.append(cell);
      cell = $("<td/>", {id:name+'_holders'});
      row.append(cell);
      cell = $("<td/>", {id:name+'_stations'});
      row.append(cell);
      cell = $("<td/>", {id:name+'_touches', html:'1'});
      row.append(cell);
      cell = $("<td/>", {html:"<input id='"+name+"_isolated' type='checkbox' onclick='isolate(\""+name+"\");'/>"});
      row.append(cell);

      table.append(row);
      // Place markers.
      $('#'+x+'_'+y+" .middle").append($('<span/>', {"id":company.name+"_train", "class":company.color+'  train', html:"&nbsp;&nbsp;"}));
      // Fill the train->from->last pipeline.
      game.companies[name].touches = [x+'_'+y];
      game.companies[name].from = game.companies[name].train;
      game.companies[name].last = game.companies[name].train;
   });

   game.co_list.forEach(function (company) {
      var c = game.companies[company];
      game.Players.forEach(function (p) {
         if (p.idx == undefined) {
            return;
         }
         p.shares[c.name] = 0;
         c.holders[p.idx] = 0;
         c.stations[p.idx] = 0;
      });
   });
   game.player_idx = game.player_order[game.max_player];
   game.actions = 0;
   next_action();
}

/* utils */
Array.prototype.shuffle = function() {
    var s = [];
    while (this.length) s.push(this.splice(Math.random() * this.length, 1)[0]);
    while (s.length) this.push(s.pop());
    return this;
}
