// TODO:
//  remove unconnect goods


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

Array.prototype.shuffle = function() {
    var s = [];
    while (this.length) s.push(this.splice(Math.random() * this.length, 1)[0]);
    while (s.length) this.push(s.pop());
    return this;
}
/*  most gets value, second gets half.
   score touch town     2  most tokens
   score touch city     1/tc   most stations
   score touch railroad 1/tc   most shares     2/1 share conversion toucher -> touched.

   end discard tokens for unconnected towns/

   per token type       6

   per remaining train
   stations             1/tc most linked
   shares               1/tc 

*/

function next_turn() {
   var ap = document.getElementById("active_player");
   ap.innerText = game.Players[game.player_idx].name;
   game.moved = undefined;
   game.valid = [];
   show_valid();
   game.actions = 2;
}
function end_action() {
   next_action();
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
function take_share(p, c, overdraft) {
   if (game.companies[c].shares <= 0 && !overdraft) {
      return;
   }
   game.companies[c].shares -= 1;
   game.companies[c].holders[p] += 1;
   game.Players[p].shares[c] += 1;
   update_c_stock_ui(game.companies[c]);
   update_p_stock_ui(game.Players[p]);
}
function return_share(c, p) {
   if (game.companies[c].shares == 0) {
      return;
   }
   game.companies[c].shares += 1;
   game.companies[c].holders[p] -= 1;
   game.Players[p].shares[c] -= 1;
   update_c_stock_ui(game.companies[c]);
   update_p_stock_ui(game.Players[p]);
}
function move_head(name, x,y) {
   game.companies[name].train = [x,y];
   $('#'+x+'_'+y+" .middle").append($('#'+name+'_train'));
}
function own_track(loc, name) {
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
   $('#'+loc[0]+'_'+loc[1]+' .middle .track').remove()
   $('#'+loc[0]+'_'+loc[1]+" .middle").append($('<span/>', {"class":game.companies[name].color+' track', html:"&nbsp;"}));
}
function final_move_head(name) {
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
function place_station(loc, p) {
   if(game.Players[p].stations == 0) {
      return false;
   }
   game.Players[p].stations -= 1;
   game.loc[loc[0]+'_'+loc[1]] = ['s', p];
   $('#'+loc[0]+'_'+loc[1]+" .middle").append($('<span/>', {"class":'p'+p+' station', html:"S"}));
   update_p_station_ui(game.Players[game.player_idx]);
   next_action();
   return true;
}
function place_train(name, x, y, veto_allowed) {
   move_head(name, x, y);
   if (game.veto != undefined) {
      // in the veto process just wait for bid to get set.
      return;
   }
   game.moving = name;
   game.bid = 0;
   game.veto_winner = game.player_idx;
   take_share(game.player_idx, name, false)
   update_message('Moving '+name, true);

   if (veto_allowed) {
      game.veto = game.player_idx;
      game.bid = 0;
      game.veto_end = undefined;
      veto_next();
   } else {
      veto_done(name);
   }
}
function veto_next() {
   $('#auction').show();
   while(1) {
       var p;
       p = game.player_order.indexOf(game.veto)
       p += 1;
       if (p == game.max_player) {
           p = 0;
       }
       game.veto = game.player_order[p]
       if (game.veto_end == game.veto ||
           (game.veto_end != undefined && game.veto == game.veto_winner)
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
          $('#bid_co').html(game.companies[game.moving].name);
          $('#bidder').html(game.Players[game.veto].name);
          $('#bid').val(game.bid);
          $('#h_bidder').html(game.Players[game.veto_winner].name);
          $('#h_bid').html(game.bid);
          return;
       }
   }
}
function bid() {
   var b = $('#bid').val();
   game_cmd_send("bid:"+game.player_idx+':'+b);
   bid_cmd(b);
}

function bid_cmd(b) {
   b = Math.min(b,game.Players[game.veto].shares[game.moving]);
   if (b > game.bid || (b == game.bid && game.veto == game.player_idx)) {
      game.veto_winner = game.veto;
      game.bid = b;
   }
   veto_next();
}
function bid_pass() {
   game_cmd_send("bid:"+p+":-1");
   veto_next();
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
function veto_done(name) {
   var loc = game.companies[name].train;
   $('#auction').hide();

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

function isolate(name) {
   game_cmd_send("isolate:"+game.player_idx+':'+game.name);
   isolate_cmd(name);
}

function isolate_cmd(name) {
      var co_count = 0;
      game.companies[name].shares = 0;
      update_c_stock_ui(game.companies[name]);
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
}
function click_train(x,y,c_nam) {
      var c = game.companies[c_nam];
      if (c.train[0] != x || c.train[1] != y) {
         return false;
      }
      if (game.veto) {
         // Already bidding.
         return true;
      }
      if (game.moved == c_nam) {
         // Only move a train once per turn.
         return true;
      }
      if (game.moving == c_nam) {
         // Click train again, cancel move.
         game.moving = undefined;
         game.valid = [];
         show_valid();
         return true;
      }
      game.moving = c_nam;
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
      game.valid = [];
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
         game.valid.push([x,y,merge, touch]);
      });
      show_valid();
      return true;
}
function get_good(e) {
      // take good.
      if (game.Players[game.player_idx].tokens[e.attr('town')] == undefined) {
         game.Players[game.player_idx].tokens[e.attr('town')] = '';
      }
      if (game.Players[game.player_idx].goods[e.attr('good')] == undefined) {
         game.Players[game.player_idx].goods[e.attr('good')] = 0;
      }
      game.Players[game.player_idx].tokens[e.attr('town')] += e.attr('good')
      game.Players[game.player_idx].goods[e.attr('good')] += 1; 
      update_p_token_ui(game.Players[game.player_idx]);
      e.remove();
      next_action();
}
function clickhex(h) {
   var loc;
   var e;

   if (game.end) {
      return;
   }
   e = $(h.srcElement);
   if (e.hasClass('goods')) {
      get_good(e);
      game_cmd_send("good:"+game.player_idx+':'+e.attr('id'));
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
   game.co_list.forEach(function (c_nam) {
      did_something |= click_train(x,y,c_nam);
   });

   if (did_something) {
      return;
   }
   game.valid.forEach(function (l) {
      if (x == l[0] && y == l[1]) {
         game.move_target = l;
         game_cmd_send("move:"+game.player_idx+':'+x+':'+y+':'+game.moving+':'+(game.valid.length != 1));
         place_train(game.moving, x, y, game.valid.length != 1);
         did_something = true;
         return;
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
      if (place_station([x,y], game.player_idx)) {
        game_cmd_send("station:"+game.player_idx+':'+x+':'+y);
      }
   }
}

function start()
{
   start_cmd(true);
   game_cmd_send("start:"+game.player_order.join(':'));
}

function start_cmd(order_players)
{
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
    if (order_players) {
       game.player_order = [];
    }
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
        } else {
            game.Players[i].idx=i;
            game.Players[i].row=rows[i+1];
            game.Players[i].name=ap.value;
            game.Players[i].stations = game_cfg.stations;
            if (order_players) {
               game.player_order.push(i);
            }
            game.max_player++;
        }
       update_p_station_ui(game.Players[i]);
    }
    if (order_players) {
       game.player_order.shuffle()
    }

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
      x=loc[0];
      y=loc[1];
      $('#'+x+'_'+y+" .middle").append($('<span/>', {"id":company.name+"_train", "class":company.color+'  train', html:"&nbsp;&nbsp;"}));
      move_head(name, loc[0], loc[1]);
      // Fill the train->from->last pipeline.
      game.companies[name].touches = [x+'_'+y];
      game.companies[name].from = game.companies[name].train;
      game.companies[name].last = game.companies[name].train;
      final_move_head(name);
   });

   game.co_list.forEach(function (c_nam) {
      var c = game.companies[c_nam];
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
function end() {
   // Per good, pay 6/3
   // Per remaining company pay 1/tc for stations and stock
   game.end = true;
   update_message("Game over",false);
   for (var c in game.companies) {
      if (!game.companies.hasOwnProperty(c)) {
         continue;
      }
      update_message(c,false);
      update_message("Pay stations",false);
      pay_town(c, 'stations');
      update_message("Pay stock",false);
      pay_town(c, 'holders');
   }
   for (var g in "pbtsg") {
      var good="pbtsg".charAt(g);
      update_message("Goods: "+good,false);
      update_message("Pay goods",false);
      pay_city(good, 'goods', 6);
   }
   $('#restart').show();
}

function update_message(m, clear)
{
   if (clear) {
      $('#message').empty();
   }
   $('#message').append($('<div/>',{text:m}));
}

function update_name(p)
{
   var ap = document.getElementById("p"+p+"_name");
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
function update_p_station_ui(p)
{
  var h = $('#p'+p.idx+'_stations');
  h.html(p.stations);
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
function show_valid()
{
   $('.valid').removeClass('valid');
   game.valid.forEach(function (l) {
      $('#'+l[0]+'_'+l[1]+" .middle").addClass('valid');
   });
}

// Multi screen interface
function game_cmd(c, data)
{
   var cmd = data.split(':');
   console.log("rx: "+cmd);

   if (cmd[0] == 'name') {
      var ap = document.getElementById("p"+cmd[1]+"_name");
      ap.value = cmd[2];
      var ap = document.getElementById("p"+cmd[1]+"_peer");
      ap.innerText = c.peer;
      game.Players[+cmd[1]].peer = c.peer;
   }
   else if (cmd[0] == 'bid') {
      bid_cmd(cmd[2]);
   } else if (cmd[0] == 'station') {
      place_station([cmd[2],cmd[3]], cmd[1]);
   } else if (cmd[0] == 'move') {
      click_train(+game.companies[cmd[4]].train[0],
                  +game.companies[cmd[4]].train[1],
                  cmd[4]);
      show_valid();
      game.valid.forEach(function (l) {
         if (cmd[2] == l[0] && cmd[3] == l[1]) {
            game.move_target = l;
         }
      });
      place_train(cmd[4], cmd[2], cmd[3], cmd[5]);
   } else if (cmd[0] == 'good') {
      get_good($('#'+cmd[2]));
   } else if (cmd[0] == 'close') {
      isolate_cmd(cmd[1]);
   } else if (cmd[0] == 'start') {
      game.player_order = cmd.slice(1);
      start_cmd(false);
   } else if (cmd[0] == 'end') {
      end();
   }
}

function update_name(p)
{
   var ap = document.getElementById("p"+p+"_name");
   game_cmd_send("name:"+p+":"+ ap.value);
}

function update_bid(p)
{
   var ap = document.getElementById("p"+p+"_bid");
   game_cmd_send("bid:"+p+":"+ ap.value);
}
