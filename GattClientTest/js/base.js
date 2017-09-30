function clear()
{
    msgText.innerHTML = "";
}
function info()
{
    if (arguments.length == 1)
    {
        msgText.innerHTML += "<div><span class='info'>" + arguments[0] + "</span></div>";
    } else if (arguments.length == 2)
    {
        msgText.innerHTML += "<div><span class='tag'>" + arguments[0] + "</span> : <span  class='info'>" + arguments[1] + "</span></div>";
    }

}
function error()
{
    if (arguments.length == 1)
    {
        msgText.innerHTML += "<div><span class='error'>" + arguments[0] + "</span></div>";
    } else if (arguments.length == 2)
    {
        msgText.innerHTML += "<div><span class='tag'>" + arguments[0] + "</span> : <span  class='error'>" + arguments[1] + "</span></div>";
    }
}