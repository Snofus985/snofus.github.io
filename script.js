// Randomly select a wall PNG and its corresponding mirror alignment on each load.
// Adjust x, y, and size independently for each image as needed.
const backgrounds = [
  { image: "background1.png", x: "50%", y: "70%", size: "45%" },
  { image: "background2.png", x: "50%", y: "70%", size: "45%" },
  { image: "background3.png", x: "50%", y: "70%", size: "45%" },
  { image: "background4.png", x: "50%", y: "70%", size: "45%" },
  { image: "background5.png", x: "50%", y: "70%", size: "45%" },
  { image: "background6.png", x: "50%", y: "70%", size: "45%" }
];
const selectedBackground = backgrounds[Math.floor(Math.random() * backgrounds.length)];
const rootStyle = document.documentElement.style;
rootStyle.setProperty("--background-image", `url("${selectedBackground.image}")`);
rootStyle.setProperty("--mirror-x", selectedBackground.x);
rootStyle.setProperty("--mirror-y", selectedBackground.y);
rootStyle.setProperty("--mirror-size", selectedBackground.size);

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const buffer = document.createElement('canvas');
const bctx = buffer.getContext('2d');

const psHorizontal = document.getElementById('psHorizontal');
const psVertical = document.getElementById('psVertical');

const psDestruct = document.getElementById('psDestruct');

const psThreshold = document.getElementById('psThreshold');

const psChaos = document.getElementById('psChaos');

let w=0,h=0;

navigator.mediaDevices.getUserMedia({video:true}).then(stream=>{
  video.srcObject=stream;
  video.onloadedmetadata=()=>{
    video.play();
    w=buffer.width=video.videoWidth;
    h=buffer.height=video.videoHeight;
  };
});

function getFrame(){
  bctx.drawImage(video,0,0,w,h);
  return bctx.getImageData(0,0,w,h);
}

function pixelSort(imageData){
  const threshold=parseInt(psThreshold.value);
  const chaos=parseInt(psChaos.value)/100;

  const {data,width,height}=imageData;
  const output=new Uint8ClampedArray(data);

  function brightness(i){ return (data[i]+data[i+1]+data[i+2])/3; }

  function sortSegment(indices){
    const segment=indices.map(i=>({
      r:data[i],g:data[i+1],b:data[i+2],a:data[i+3],
      bright:brightness(i)
    }));

    segment.sort((a,b)=>a.bright-b.bright);

    if(psDestruct.checked){
      for(let i=segment.length-1;i>0;i--){
        const j=Math.floor(Math.random()*segment.length*chaos);
        [segment[i],segment[j]]=[segment[j],segment[i]];
      }
    }

    indices.forEach((idx,i)=>{
      output[idx]=segment[i].r;
      output[idx+1]=segment[i].g;
      output[idx+2]=segment[i].b;
      output[idx+3]=segment[i].a;
    });
  }

  // Horizontal pixel sorting
  if(psHorizontal.checked){
    for(let y=0;y<height;y++){
      let indices=[];
      for(let x=0;x<width;x++){
        const i=(y*width+x)*4;
        const b=brightness(i);

        if(b>threshold) indices.push(i);
        else{ if(indices.length){ sortSegment(indices); indices=[]; } }
      }
      if(indices.length) sortSegment(indices);
    }
  }

  // Vertical pixel sorting
  if(psVertical.checked){
    for(let x=0;x<width;x++){
      let indices=[];
      for(let y=0;y<height;y++){
        const i=(y*width+x)*4;
        const b=brightness(i);

        if(b>threshold) indices.push(i);
        else{ if(indices.length){ sortSegment(indices); indices=[]; } }
      }
      if(indices.length) sortSegment(indices);
    }
  }

  return new ImageData(output,width,height);
}

function loop(){
  if(!w||video.readyState<2){ requestAnimationFrame(loop); return; }

  let curr=getFrame();
  if(psHorizontal.checked || psVertical.checked)
    curr=pixelSort(curr);

  bctx.putImageData(curr,0,0);
  const cropSize=Math.min(w,h);
  const sx=(w-cropSize)/2;
  const sy=(h-cropSize)/2;

  // Resize the visible canvas to a square output while the processing buffer
  // keeps the camera's native dimensions.
  if(canvas.width!==cropSize || canvas.height!==cropSize){
    canvas.width=cropSize;
    canvas.height=cropSize;
  }

  ctx.save();
  ctx.translate(cropSize,0);
  ctx.scale(-1,1);
  ctx.drawImage(buffer,sx,sy,cropSize,cropSize,0,0,cropSize,cropSize);
  ctx.restore();
  requestAnimationFrame(loop);
}
loop();
