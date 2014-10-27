// Multi screen interface
function game_cmd(c, data)
{
   var ap = document.getElementById("log");
   ap.innerText += c.peer+':'+data+'\n';
}

function send_cmd()
{
   var ap = document.getElementById("input");
   game_cmd_send($('#pid').text()+":"+ ap.value);
   ap.value = "";
}
