console.log("test");
const button = document.getElementById("submit");
const amountInput = document.getElementById("amount-input");
const thresholdInput = document.getElementById("threshold-input");
const lookupEnableInput = document.getElementById("lookup-Enable");
const messageElement = document.getElementById("message");

button.addEventListener("click", async()=>{
    const amount = Number(amountInput.value);
    const threshold = Number(thresholdInput.value);
    const lookupEnable = (lookupEnableInput.checked)
    console.log(amount);
    console.log(threshold);
    const res = await fetch("/settings",{
        method:"POST",
        body: JSON.stringify({
            amount,threshold, lookupEnable
        }),
        headers: {
            "Content-Type" : "application/json"
        }
    })
    console.log(res.status);
    if(res.status == 200){
        messageElement.textContent = "Successfully Connected"
    }
    else{
        messageElement.textContent = "Error"
    }
})
const res = await fetch("/settings")
const currentSettings = await res.json()
amountInput.value = currentSettings.amount;
thresholdInput.value = currentSettings.threshold;
lookupEnableInput.checked = currentSettings.lookup;