import puppeteer from "puppeteer";
import fs from 'fs';
import path from 'path';


const getProfs = async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });

  const page = await browser.newPage();

  await page.goto("https://www.sastra.edu/staffprofiles/schools/soc.php", {
    waitUntil: "domcontentloaded",
  });
  

  const profDetails = await page.evaluate(() => {
    const cardList = document.querySelectorAll(".card");
    return Array.from(cardList).map((card) => {
        const imageSrc = card.querySelector("img").src;
        const profID = imageSrc.split('/').pop().split('.').shift();
        const profName = card.querySelector("h1").innerText;
        return { profID, imageSrc, profName };
    })
  });
  
  for (const objs of profDetails){
    const {profID,imageSrc,profName} = objs;
    const imagePage = await page.goto(imageSrc);
    fs.writeFile(path.join('./images',`image_${imageSrc.split('/').pop()}`), await imagePage.buffer(), () => console.log('Image Downloaded!'));
  };
  console.log(profDetails);

  await browser.close();
};

getProfs();