function get(id) {
  return document.getElementById(id);
}

function hide(ele) {
  ele.classList.add("hide");
}

function show(ele) {
  ele.classList.remove("hide");
}

function buttonClick(ele, func) {
  ele.addEventListener("click", func);
}

const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const help = {
  get,
  hide,
  show,
  buttonClick,
  sleep
}

export default help;