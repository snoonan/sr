var game_cfg = {
   "start_money": [-1,0,0,40,30,24],
   "stations": 7,
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
      [[6,2],  ['g','g','t'], 'pink'],
      [[10,3], ['g','g','b'], 'grey'],
      [[15,3], ['t','t','b'], 'white'],
      [[6,6],  ['b','b','g'], 'beige'],
      [[17,6], ['g','g','s'], 'cornflower'],
      [[11,7], ['s','s','b'], 'green'],
      [[6,8],  ['s','s','t'], 'yellow'],
      [[15,8], ['t','t','s'], 'paleblue'],
      [[5,10], ['s','s','g'], 'palepurple'],
      [[8,10], ['b','b','t'], 'mauve'],
      [[11,11],['t','t','g'], 'brown'],
      [[12,12],['b','b','s'], 'mint']
   ],
   "map": [
"  p p p p     p p p p p p p p p ",
",p p p p p   p p p p p p p p p p ",
"p p p p p p pcp p p p p p p p p p ",
",p p p ptp p p p p pcp p p p pcp ",
"  p p p p p p p p p p p p p p p pt",
",p p p p p ptp p p p p ptp p p p ",
"  p p pcp p p p p ptp p p p pcp p ",
",p p p p p p p pcp p p p p p p p ",
"  p pcp p ptp p p p p pcp p p p p ",
",p p p p p p p p p p p p p ptp p ",
"pcp p pcp p p p p ptp p p p p p ",
",p p p p p pcp p p p p p p p ",
"p p ptp p p p pcp p p ",
",p p p   p p p p p p p ",
"  p p     p p p p p p p ",
",  p       p p p p p p ",
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

var game = {
};

function next_turn() {
   var ap = document.getElementById("active_player");
   ap.innerText = game.players[game.player_idx].name;
   game.moved = undefined;
   game.valid = [];
   show_valid();
   game.actions = 2;
}
function end_action() {
   next_action();
}
function next_action() {
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
   game.players[p].shares[c] += 1;
   update_c_stock_ui(game.companies[c]);
   update_p_stock_ui(game.players[p]);
}
function pay_share(c, p) {
   if (game.companies[c].shares == 0) {
      return;
   }
   game.companies[c].shares -= 1;
   game.companies[c].holders[p] -= 1;
   game.players[p].shares[c] += 1;
   update_c_stock_ui(game.companies[c]);
   update_p_stock_ui(game.players[game.player_idx]);
}
function move_head(name, x,y) {
   game.companies[name].train = [x,y];
   $('#'+x+'_'+y+" .middle").append($('#'+name+'_train'));
}
function own_track(loc, name) {
   game.companies[name].track.push(loc[0]+'_'+loc[1]);
   game.loc[loc[0]+'_'+loc[1]] = ['r',name];
   $('#'+loc[0]+'_'+loc[1]+' .middle .track').remove()
   $('#'+loc[0]+'_'+loc[1]+" .middle").append($('<span/>', {"class":game.companies[name].color+' track', html:"&nbsp;"}));
}
function final_move_head(name) {
   game.companies[name].last = game.companies[name].from
   own_track(game.companies[name].last, name);
   game.companies[name].from = game.companies[name].train
   loc = game.companies[name].train;
   game.loc[loc[0]+'_'+loc[1]] = ['T',name];
   game.valid = [];
   show_valid();
}
function place_station(loc, p) {
   if(game.players[p].stations == 0) {
      return false;
   }
   game.players[p].stations -= 1;
   game.loc[loc[0]+'_'+loc[1]] = ['s', p];
   $('#'+loc[0]+'_'+loc[1]+" .middle").append($('<span/>', {"class":'p'+p+' station', html:"S"}));
   update_p_station_ui(game.players[game.player_idx]);
   return true;
}
function place_train(name, x, y, veto_allowed) {
   game.moving = name;
   game.bid = 0;
   game.veto_winner = game.player_idx;
   take_share(game.player_idx, name, false)

   move_head(name, x, y);
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
       if (game.players[game.veto].shares[game.moving] > game.bid) {
          $('#bid_co').html(game.companies[game.moving].name);
          $('#bidder').html(game.players[game.veto].name);
          $('#bid').val(game.bid);
          $('#h_bidder').html(game.players[game.veto_winner].name);
          $('#h_bid').html(game.bid);
          return;
       }
   }
}
function bid() {
   var b = $('#bid').val();
   b = Math.min(b,game.players[game.veto].shares[game.moving]);
   if (b > game.bid) {
      game.veto_winner = game.veto;
      game.bid = b;
   }
   veto_next();
}
function bid_pass() {
   veto_next();
}
function pay_town() {
   // Count stations, pays out 1/touch to first and .5/touch to second. Ties share
   var most = 0;
   var most_p = [];
   var next = 0;
   var next_p = [];
   for (var p = 0; p < game.max_player; p++) {
      if (game.companies[game.moving].stations[p] > most) {
         next = most;
         next_p = most_p;
         most = game.companies[game.moving].stations[p];
         most_p = [];
         // Fall thru into next if.
      }
      if (game.companies[game.moving].stations[p] == most) {
         most_p.push(p);
         continue;
      }
      if (game.companies[game.moving].stations[p] > next) {
         next = game.companies[game.moving].stations[p];
         next_p = [];
         // Fall thru into next if.
      }
      if (game.companies[game.moving].stations[p] == next) {
         next_p.push(p);
         continue;
      }
   }
   if (most == 0) {
      return;
   }
   if (most_p.length == 1) {
      game.players[most_p[0]].money += game.companies[game.moving].touches.length;
      update_p_money_ui(game.players[most_p[0]]);
   } else if (most_p.length > 0) {
      next_p = []; // Tie for first means no second.
      var total = Math.floor(game.companies[game.moving].touches.length * 1.5);
      for( var p in most_p) {
         game.players[p].money += Math.floor(total/most_p.length);
         update_p_money_ui(game.players[p]);
      }
   }
   if (next == 0) {
      return;
   }
   if (next_p.length == 1) {
      game.players[next_p[0]].money += Math.floor(game.companies[game.moving].touches.length*0.5);
      update_p_money_ui(game.players[next_p[0]]);
   } else if (next_p.length > 0) {
      var total = Math.floor(game.companies[game.moving].touches.length * 0.5);
      for( var p in next_p) {
         game.players[p].money += Math.floor(total/next_p.length);
         update_p_money_ui(game.players[p]);
      }
   }
}
function pay_city() {
}
function veto_done(name) {
   var loc = game.companies[name].train;
   $('#auction').hide();

   var at_loc = game.loc[loc[0]+'_'+loc[1]];
   game.moved = name;
   final_move_head(name);
   while(game.bid) {
      game.bid -= 1;
      pay_share(name, game.veto_winner);
   }
   if (at_loc && at_loc[0] == 's') {
      //Touched a station, remember it, and maybe give a passanger.
      var owner = +at_loc[1];
      game.companies[name].stations[owner] += 1;
      if (owner != game.veto_winner && game.veto_winner == game.player_idx) { // If it is not my station AND I decided to go here.
         if (game.passengers > 0) {
            game.players.tokens['p'] += 1;
            game.passengers -= 1;
         }
      }
      update_c_station_ui(game.companies[game.moving]);
   }
   // Touched something
   if (game.move_target[3] != undefined) {
      var loc = game.move_target[3];
      var loc_str = loc[0]+'_'+loc[1];
      var at_loc = game.loc[loc[0]+'_'+loc[1]];

      if (game.companies[game.moving].touches.indexOf(loc_str) == -1) {
         game.companies[game.moving].touches.push(loc_str);
         update_c_touches_ui(game.companies[game.moving]);
         if (at_loc[0] == 't') {
            pay_town();
         }
         if (at_loc[0] == 'c') {
            pay_city();
         }
      }
   }

   // Merging
   if (game.move_target[2] != undefined) {
      // Merge happened to [2]
      game.companies[game.moving].track.forEach(function(t) {
         own_track(t.split('_'), game.move_target[2]);
      });
      for(var p = 0; p < game.companies[game.moving].holders.length; p++)
      {
         for(var i = game.players[p].shares[game.moving]; i >= 2; i-=2) {
            take_share(p, game.move_target[2], true);
         }
         game.players[p].shares[game.moving] = 0;
         update_p_stock_ui(game.players[p]);
      };
      game.companies[game.moving].holders = [];
      game.companies[game.moving].shares = 0;
      for (var p = 0; p < game.max_player; p++) {
         game.companies[game.move_target[2]].stations[p] += game.companies[game.moving].stations[p];
         game.companies[game.moving].stations[p] = 0;
      }

      game.companies[game.move_target[2]].touches = game.companies[game.move_target[2]].touches.concat(game.companies[game.moving].touches);
      update_c_station_ui(game.companies[game.moving]);
      update_c_touches_ui(game.companies[game.moving]);
      update_c_station_ui(game.companies[game.move_target[2]]);
      update_c_stock_ui(game.companies[game.moving]);
      $('#'+game.companies[game.moving].name+'_train').remove();
      // Replace the train with track.
      own_track(game.companies[game.moving].train, game.move_target[2]);
   }
   game.moving = undefined;
   next_action();
}
function click_train(x,y,c_nam) {
      var c = game.companies[c_nam];
      if (c.train[0] != x || c.train[1] != y) {
         return false;
      }
      if (game.moved == c_nam) {
         // Only move a train once per turn.
         return false;
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
         var touch = undefined;
         var x = l[0];
         var y = l[1];
         [[x-1,y-1], [x-1,y], [x,y-1],
         [x,y+1], [x+1,y], [x+1,y+1]].forEach(function (test) {
            // Check for merge and multiple merge (multi not valid)
            var loc = game.loc[test[0]+'_'+test[1]];
            if (loc && loc[0] == 'c') {
               touch = test;
            }
            if (loc && loc[0] == 't') {
               touch = test;
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
         });;
         if (merge == 'xxx') {
            return;
         }
         game.valid.push([x,y,merge, touch]);
      });
      show_valid();
      return true;
}
function clickhex(h) {
   var loc;
   var e;

   e = $(h.srcElement);
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
         place_train(game.moving, x, y, game.valid.length != 1);
         did_something = true;
         return;
      }
   });

   if (did_something) {
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
        next_action();
      }
   }
}

function start()
{
   var map = $('#map');
   var table;
   var x,y;
   var start_col;

   x = 0; y = 0;
   start_col = 0;
   game.loc = {};
   game.valid = [];
   show_valid();
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
            cell.append($("<span/>", { text:c.charAt(1)/*, style:"position:relative; z-index:2"*/}));
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

    var tbl = document.getElementById('players');
    var rows = tbl.getElementsByTagName('tr');
    var r;
    game.players = [{},{},{},{}],
    game.player_order = [];
    game.max_player = 0;
    for(var i=0; i < 4; i++) {
        game.players[i].shares = [];
        game.players[i].tokens = [];
        game.players[i].money = 0;
        var ap = document.getElementById("p"+i+"_name");
        if (ap.value == '') {
            var ap = document.getElementById("p"+i);
            ap.hidden = true;
        } else {
            game.players[i].idx=i;
            game.players[i].row=rows[i+1];
            game.players[i].name=ap.value;
            game.players[i].stations = game_cfg.stations;
            game.player_order.push(i);
            game.max_player++;
        }
       update_p_station_ui(game.players[i]);
    }
    game.player_order.shuffle()

    // Show players in turn order
    var after = rows[0];
    for(var i=0; i< game.max_player; i++) {
        var prow;
        prow=game.players[game.player_order[i]].row;
        after.parentNode.insertBefore(prow.parentNode.removeChild(prow), after.nextSibling);
        after=prow;
    }

   table = $('#companies');
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
      cell = $("<td/>", {id:name+'_touches'});
      row.append(cell);

      table.append(row);
      // Place markers.
      x=loc[0];
      y=loc[1];
      $('#'+x+'_'+y+" .middle").append($('<span/>', {"id":company.name+"_train", "class":company.color+'  train', html:"&nbsp;&nbsp;"}));
      move_head(name, loc[0], loc[1]);
      // Fill the train->from->last pipeline.
      game.companies[name].from = game.companies[name].train;
      game.companies[name].last = game.companies[name].train;
      final_move_head(name);
   });

   game.co_list.forEach(function (c_nam) {
      var c = game.companies[c_nam];
      game.players.forEach(function (p) {
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
function update_c_stock_ui(c)
{
  var h = $('#'+c.name+'_holders');

  h.empty();
  for(var p in c.holders) {
    var l;
    if (! (c.holders[p] > 0)) { continue; }
    l = $('<div/>', {html: game.players[p].name+': '+c.holders[p]});
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
    l = $('<div/>', {html: game.players[p].name+': '+c.stations[p]});
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
function show_valid()
{
   $('.valid').removeClass('valid');
   game.valid.forEach(function (l) {
      $('#'+l[0]+'_'+l[1]+" .middle").addClass('valid');
   });
}
