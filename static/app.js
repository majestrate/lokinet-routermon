/** app.js 
    fill me up with logic uwu
*/


const createApp = () => {

  let root = document.getElementById("root");
  return (data) => {
    root.innerText = JSON.stringify(data);
  };
};
