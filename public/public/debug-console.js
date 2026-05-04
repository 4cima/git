// Test script to check browser console
const checkConsole = () => {
  console.log('=== Image Loading Debug ===');
  const images = document.querySelectorAll('img');
  console.log('Total images:', images.length);
  
  images.forEach((img, i) => {
    if (i < 10) {
      console.log(Image 165:, {
        src: img.src,
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        className: img.className
      });
    }
  });
  
  const containers = document.querySelectorAll('[class*="container"]');
  console.log('Containers with ref:', containers.length);
};

checkConsole();
