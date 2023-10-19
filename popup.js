function getUrl(currUrl){
  const newOption = document.getElementById("new");
  const usedOption = document.getElementById("used");
  const soldOption = document.getElementById("sold");

  const url = new URL(currUrl);


  url.searchParams.delete("_pgn");

  if(newOption.checked || usedOption.checked ){

    if(newOption.checked){
      url.searchParams.set("LH_ItemCondition",1000)
    }

    if(usedOption.checked){
      url.searchParams.set("LH_ItemCondition",3000)
    }

    if(newOption.checked && usedOption.checked){
      url.searchParams.set("LH_ItemCondition","1000%7C3000")
    }

  }
  
  if(soldOption.checked){
    url.searchParams.set("LH_Sold",1)
    url.searchParams.set("LH_Complete",1)
  }

  return(url);
}


async function getScrapData(url,pages){
  const scrapData = [];
  const parser = new DOMParser();

  const showPrice = document.getElementById("showPrice");
  const outerProgressBar = document.getElementById("outerProgressBar");
  const innerProgressBar = document.getElementById("innerProgressBar");

  innerProgressBar.style.width="0%";
  innerProgressBar.innerText="0%";

  let totalCalls= (100/(Number(pages)+1));

  showPrice.style.display="none";
  outerProgressBar.style.display="block"


  for(let i=0 ; i<=Number(pages); i++){

    

    url.searchParams.set("_pgn",i);

    const htmlResponse = await fetch(url.href);
    const data = await htmlResponse.text();
    const parsedData = parser.parseFromString(data, 'text/html');
    scrapData.push(parsedData);

    innerProgressBar.style.width = parseInt(innerProgressBar.style.width)+totalCalls+"%";
    innerProgressBar.innerText= (parseInt(innerProgressBar.innerText)+totalCalls).toFixed(2)+"%";

  }
  await fetch(url.href);
  innerProgressBar.style.width = parseInt(innerProgressBar.style.width)+totalCalls+"%";
  innerProgressBar.innerText= (parseInt(innerProgressBar.innerText)+totalCalls).toFixed(2)+"%";

  

  showPrice.style.display="block";
  outerProgressBar.style.display="none"

  return scrapData;
}

function getPriceList(scrapData){

  const priceList = []


  for(const data of scrapData){
    const itemList = data.getElementsByClassName("s-item__price");



    for(let i=1 ; i<itemList.length ; i++){

      console.log(itemList[i].innerText);

      const numbers = itemList[i].innerText.match(/\d+\.\d+/g);

      if(numbers.length==1){
          priceList.push({
              max: parseFloat(numbers[0]),
              min: parseFloat(numbers[0])
          })
      }else{
          priceList.push({
              max: parseFloat(numbers[1]),
              min: parseFloat(numbers[0])
          })
      }
    }
    
  }

  return priceList;

}

function getPages(scrapData){
  const resultsString = scrapData.getElementsByClassName("srp-controls__count-heading")[0].innerText;

  let results = resultsString.match(/(\d{1,3}(,\d{3})*|\d+)/);

  if(results){
    results = parseInt(results[0].replace(/,/g, ''));
  }else{
    results=0;
  }

  const pages = Math.min(167,parseInt(results/60)+1);

 return pages;
}

function getPrceDetail(priceList){

  const priceDetail = {
    minPrice:Number.MAX_SAFE_INTEGER,
    avgPrice: 0,
    maxPrice: 0,
    mod: 0

  }
  const modHash = {} 


  for(const price of priceList){

    modHash[price.min] = (modHash[price.min] || 0) + 1;
    modHash[price.max] = (modHash[price.max] || 0) + 1;


    priceDetail.avgPrice += (price.min+price.max)/2

      if(priceDetail.maxPrice<price.max){
        priceDetail.maxPrice=price.max
      }

      if(priceDetail.minPrice>price.min){
        priceDetail.minPrice=price.min
      }
  }

  let maxFrequency=0;

  for(const key in modHash){
      if(modHash[key]>maxFrequency){
        maxFrequency = modHash[key];
        priceDetail.mod=key;
      }
  }

  priceDetail.avgPrice = ( priceDetail.avgPrice/priceList.length).toFixed(2);



  return priceDetail;
}

function renderPrices(priceDetail,pages){

    const {maxPrice, minPrice, avgPrice, mod} = priceDetail;

    document.getElementById("minPrice").innerText= `${minPrice} $`
    document.getElementById("avgPrice").innerText= `${avgPrice} $`
    document.getElementById("maxPrice").innerText= `${maxPrice} $`
    document.getElementById("mod").innerText= `${mod} $`


    document.getElementById("totalPages").innerText=`Total Pages: ${pages}`;

    const selectedPage = document.getElementById("selectedPage");

    selectedPage.innerHTML="";

    for(let i=0 ; i<pages ; i++){
      
      const option = document.createElement('option');
      option.innerText=i;

      selectedPage.appendChild(option);
    }

    // console.log(minPrice, avgPrice, maxPrice, mod);

}


document.addEventListener('DOMContentLoaded', function () {
  const showURLButton = document.getElementById('getPrice');


  showURLButton.addEventListener('click', function () {

    chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {

      const url =  getUrl(tabs[0].url);
      const selectedPage = document.getElementById("selectedPage");

      if(url.hostname==="www.ebay.com"){

     
        const scrapData = await getScrapData(url,selectedPage.value);

        const priceList = getPriceList(scrapData);

        const pages = getPages(scrapData[0]);

        const priceDetail = getPrceDetail(priceList);

        renderPrices(priceDetail,pages);
      }else{
        console.log("Host is not ebay");
      }

    });
    
  });
});