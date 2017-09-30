let startBtn = document.getElementById("startBtn");
let clientList = document.getElementById("clientList");
let msgText = document.getElementById("msgText");
let sendText = document.getElementById("sendText");
let sendBtn = document.getElementById("sendBtn");
let startText = startBtn.parentElement.childNodes[1];

//导入包
let { BluetoothCacheMode, BluetoothError, BluetoothAdapter, BluetoothConnectionStatus, BluetoothDevice, BluetoothLEDevice } = Windows.Devices.Bluetooth;
let { GattSharingMode, GattProtectionLevel, GattServiceProviderAdvertisementStatus, GattServiceProviderAdvertisingParameters, GattLocalCharacteristicParameters, GattServiceProvider, GattCharacteristic, GattCommunicationStatus, GattCharacteristicProperties, GattClientCharacteristicConfigurationDescriptorValue } = Windows.Devices.Bluetooth.GenericAttributeProfile;
let { BluetoothLEAdvertisementWatcher, BluetoothLEScanningMode, BluetoothLEAdvertisement } = Windows.Devices.Bluetooth.Advertisement;
let { DeviceInformation, DeviceInformationKind } = Windows.Devices.Enumeration;
let { StreamSocket, SocketProtectionLevel } = Windows.Networking.Sockets;
let { DataWriter, DataReader, UnicodeEncoding } = Windows.Storage.Streams;

/**
 * 一些常量
 */
const Constants = {
    SERVICE_MESSAGE_UUID: "00001803-0000-1000-8000-00805F9B34FB",
    CHARACTERISTIC_MESSAGE_UUID: "00002A03-0000-1000-8000-00805F9B34FB",
    /**启动参数*/
    ADV_PARMS: new GattServiceProviderAdvertisingParameters()
};

/**
 * 服务提供者
 */
let provider;

/**
 * 
 */
async function connect()
{
    info("正在开启服务...");
    console.clear();
    console.log("初始化");
    let adapter = await BluetoothAdapter.getDefaultAsync();
    console.log(adapter);
    if (adapter == null)
    {
        error("没有或没有开启蓝牙适配器");
        disconnect();
        return;
    }
    if (!adapter.isPeripheralRoleSupported)
    {
        error("蓝牙适配器不支持外围功能,不能连接到蓝牙");//
      //  return;
    }
    Constants.ADV_PARMS.isConnectable = adapter.isPeripheralRoleSupported;
    Constants.ADV_PARMS.isDiscoverable = true;
    console.log(Constants.ADV_PARMS);

    GattServiceProvider.createAsync(Constants.SERVICE_MESSAGE_UUID).then(ret =>
    {
        console.log(ret);
        if (ret.error != BluetoothError.success)
        {
            startBtn.removeAttribute("disabled");
            error("启动服务错误:" + ret.error);
            disconnect();
        } else
        {
            info("已启动服务", ret.serviceProvider.service.uuid);
            provider = ret.serviceProvider; 
            startAdvertising(provider);
        }

    }, err =>
        {
            error("不支持服务功能,不能作为服务端:" + err);
            disconnect();
        });
}
/**
 * 开始发布服务
 * @param {Windows.Devices.Bluetooth.GenericAttributeProfile.GattServiceProvider} provider
 */
async function startAdvertising(provider)
{
    provider.addEventListener("advertisementstatuschanged", function (evt)
    {
        console.log(evt);
        if (evt.status == GattServiceProviderAdvertisementStatus.started)
        {
            info("发布成功");
        }
    });
    
    let settings = new GattLocalCharacteristicParameters();
    settings.characteristicProperties = (GattCharacteristicProperties.read | GattCharacteristicProperties.write | GattCharacteristicProperties.notify);
    settings.readProtectionLevel = GattProtectionLevel.plain;
    settings.userDescription = "测试属性";
    let ret = await provider.service.createCharacteristicAsync(Constants.CHARACTERISTIC_MESSAGE_UUID, settings);
    console.log(ret);
    
    if (ret.error != BluetoothError.success)
    {
        error("不能发布特征 :" + Constants.CHARACTERISTIC_MESSAGE_UUID);
        return;
    }
    info("正在发布特征", ret.characteristic.uuid);
    ret.characteristic.addEventListener("writerequested", async function (evt)
    {
        console.log(evt);
        let request = await evt.getRequestAsync();
        console.log(request);
        if (request != null)
        {
            let length = request.value.length;
            let reader = DataReader.fromBuffer(request.value); 
            reader.loadAsync(length).then(textLen =>
            {
                let str = reader.readString(textLen); 
                info("写入"+evt.target.uuid,str);
            });
        }
    });
    provider.startAdvertising(Constants.ADV_PARMS);
}
function disconnect()
{
    startBtn.checked = false;
    if (provider != null)
    { 
        info("服务已经断开");
        try
        {
            provider.stopAdvertising();

        } catch (igr) { console.log(igr); }
        provider = null;
    }
}

startBtn.onchange = function ()
{
    if (startBtn.checked)
    {
        connect().then(success => { }, err =>
        {
            console.log(err);
        });
    } else
    {
        disconnect();
    }
};
