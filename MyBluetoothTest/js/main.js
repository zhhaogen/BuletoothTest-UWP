//导入包
let { BluetoothAdapter } = Windows.Devices.Bluetooth;
let { DeviceInformation, DeviceInformationKind } = Windows.Devices.Enumeration;

async function init()
{
    console.clear();
    clear();
    // 获取默认蓝牙设备 BluetoothAdapter.getDefaultAsync();
    let defalutAdapter = await BluetoothAdapter.getDefaultAsync();
    console.log(defalutAdapter);
    //针对多个蓝牙设备
    let selector = BluetoothAdapter.getDeviceSelector();
    console.log(selector);
    let devices = await DeviceInformation.findAllAsync(selector);
    console.log(devices);
    let bluetoothAdapters = {};
    for (let i = 0; i < devices.length; i++)
    {
        let device = devices[i];
        let bluetoothAdapter = null;
        try
        {
            bluetoothAdapter = await BluetoothAdapter.fromIdAsync(device.id);
        } catch (igr)
        {
        }
        if (bluetoothAdapter != null)//校验蓝牙设备
        {
            if (bluetoothAdapters[bluetoothAdapter.bluetoothAddress] == null)
            {
                bluetoothAdapters[bluetoothAdapter.bluetoothAddress] = [];
            }
            bluetoothAdapters[bluetoothAdapter.bluetoothAddress].push(bluetoothAdapter);
        }
    }
    //id不一样但蓝牙地址一样
    console.log(bluetoothAdapters);
    let keys = Object.keys(bluetoothAdapters);
    info("有" + keys.length + "块蓝牙适配器");
    if (defalutAdapter != null)
    {
        info("默认蓝牙设备id:" + defalutAdapter.deviceId);
    }
    for (key of keys)
    { 
        let arr = bluetoothAdapters[key];
        newLine();
        info("蓝牙地址:" + key + " ,有" + arr.length+"个设备id");
        for (let i = 0; i < arr.length;i++)
        {
            let ad = arr[i]; 
            info("设备id:" + ad.deviceId);
            if (i == arr.length-1)
            {
                info("是否支持广告卸载:" + ad.isAdvertisementOffloadSupported);
                info("是否支持低功耗重要角色:" + ad.isCentralRoleSupported);
                info("是否支持经典模式:" + ad.isClassicSupported);
                info("是否支持低功耗:" + ad.isLowEnergySupported);
                info("是否支持低功耗外围角色:" + ad.isPeripheralRoleSupported);
            }
        }
    }
}

function clear()
{
    logText.innerHTML = "";
}
function info(msg)
{
    let d = document.createElement("div");
    d.innerText = msg;
    logText.appendChild(d);
}
function newLine()
{
    let d = document.createElement("hr"); 
    logText.appendChild(d);
} 
initBtn.onclick = function ()
{
    init();
};
