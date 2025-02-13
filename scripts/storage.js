function save(key, value) {
    localStorage.setItem(key, value);  
  }
  
  function load(key) {
    return localStorage.getItem(key);
  }
  
  let exports = {
    save,
    load
  };
  
  export default exports;