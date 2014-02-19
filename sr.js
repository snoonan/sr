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
function take_share(c, overdraft) {
   if (game.companies[c].shares <= 0 && !overdraft) {
      return;
   }
   game.companies[c].shares -= 1;
   game.companies[c].holders[game.player_idx] += 1;
   game.players[game.player_idx].shares[c] += 1;
   update_c_stock_ui(game.companies[c]);
   update_p_stock_ui(game.players[game.player_idx]);
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
function final_move_head(name) {
   game.companies[name].last = game.companies[name].from
   game.companies[name].from = game.companies[name].train
   var loc = game.companies[name].train;
   game.loc[loc[0]+'_'+loc[1]] = ['t',name];
   $('#'+loc[0]+'_'+loc[1]+'>.middle').addClass(name);
   game.valid = [];
   show_valid();
}
function place_train(name, x, y, veto_allowed) {
   game.moving = name;
   game.bid = 0;
   game.veto_winner = game.player_idx;
   take_share(name, false)
   // Mark trail
   var loc = game.companies[name].from;
   $('#'+loc[0]+'_'+loc[1]+" .middle").append($('<span/>', {"class":game.companies[name].color, html:"&nbsp;"}));

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
function veto_done(name) {
   var loc = game.companies[name].train;
   $('#auction').hide();

   game.moving = undefined;
   game.moved = name;
   final_move_head(name);
   while(game.bid) {
      game.bid -= 1;
      pay_share(name, game.veto_winner);
   }
   var at_loc = game.loc[loc[0]+'_'+loc[1]];
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
   }
   // check touches
   next_action();
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
   game.co_list.forEach(function (c_nam) {
      var c = game.companies[c_nam];
      if (c.train[0] != x || c.train[1] != y) {
         return;
      }
      if (game.moved == c_nam) {
         // Only move a train once per turn.
         return;
      }
      game.moving = c_nam;
      did_something = true;
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
         var x = l[0];
         var y = l[1];
         [[x-1,y-1], [x-1,y], [x,y-1],
         [x,y+1], [x+1,y], [x+1,y+1]].forEach(function (test) {
            // Check for merge and multiple merge (multi not valid)
            var loc = game.loc[test[0]+'_'+test[1]];
            if (loc && loc[0] == 't') {
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
         game.valid.push([x,y,merge]);
      });
      show_valid();
      return;
   });

   if (did_something) {
      return;
   }
   game.valid.forEach(function (l) {
      if (x == l[0] && y == l[1]) {
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
       if (loc[0] == 'T') {
          train = loc[1];
       }
       if (loc[0] == 's') {
          station = loc[1]
       }
    });
    var cost;
    cost = {'p':2, 'h':3, 'm':4}[e.attr('land')];
    var city = e.attr('city');
    if (city == 'B') {
       x = game.berlin[0];
       y = game.berlin[1];
       city = 3;
    }
    else if (city != ' ') {
       if (game.city[x+'_'+y]) {
          game.city[x+'_'+y].forEach(function (c)  {
             if(!game.companies[game.placing_co].touched[c]) {
                game.merge = true;
             }
             touch(c, game.placing_co);
             touch(game.placing_co, c);
          });
       } else {
          game.city[x+'_'+y] = [];
       }
       game.city[x+'_'+y].push(game.placing_co);
       add_income(game.placing_co, +city);
    }
    place_cube(game.placing_co, x, y);
    update_c_money(game.placing_co, -cost);
    game.placing_cubes -= 1;
    if (game.placing_cubes == 0) {
       // Last cube
       end_action();
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
            game.loc[x+'_'+y] = [];
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

      table.append(row);
      // Place markers.
      x=loc[0];
      y=loc[1];
      $('#'+x+'_'+y+" .middle").append($('<span/>', {"id":company.name+"_train", "class":company.color+'  train', html:"&nbsp;"}));
      move_head(name, loc[0], loc[1]);
      // Twice to fill the train->from->last pipeline.
      final_move_head(name);
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
function show_valid()
{
   $('.valid').removeClass('valid');
   game.valid.forEach(function (l) {
      $('#'+l[0]+'_'+l[1]+" .middle").addClass('valid');
   });
}
