let watchBtn = document.getElementById("watchBtn");
let clientList = document.getElementById("clientList");
let msgText = document.getElementById("msgText");
let sendText = document.getElementById("sendText");
let sendBtn = document.getElementById("sendBtn");
//导入包
let { BluetoothCacheMode,BluetoothConnectionStatus, BluetoothDevice, BluetoothLEDevice } = Windows.Devices.Bluetooth;
let { GattSharingMode, GattCharacteristic, GattCommunicationStatus, GattCharacteristicProperties, GattClientCharacteristicConfigurationDescriptorValue } = Windows.Devices.Bluetooth.GenericAttributeProfile;
let { BluetoothLEAdvertisementWatcher, BluetoothLEScanningMode, BluetoothLEAdvertisement } = Windows.Devices.Bluetooth.Advertisement;
let { DeviceInformation, DeviceInformationKind } = Windows.Devices.Enumeration;
let { StreamSocket, SocketProtectionLevel } = Windows.Networking.Sockets;
let { DataWriter, DataReader, UnicodeEncoding } = Windows.Storage.Streams;

let socket;
let writer;
let watcher;
let devices = new Map(); //设备列表
let operation;//选中服务操作
/**
 * 搜索设备
 *@deprecated 从缓存中查找很难找到,使用startWatch
 */
async function search()
{
    console.clear();
    let selector = BluetoothLEDevice.getDeviceSelector();
    console.log("selector", selector);
    let devices = await DeviceInformation.findAllAsync(selector);
    console.log("devices", devices);
    info("正在搜索周边设备...");
    let bluetoothDevices = new Map();
    for (const device of devices)
    {
        let bluetoothDevice = null;
        try
        {
            bluetoothDevice = await BluetoothLEDevice.fromIdAsync(device.id);
        } catch (igr) { } 
        if (bluetoothDevice != null)
        {
            // console.log(bluetoothDevice);
            bluetoothDevices.set(bluetoothDevice.deviceId, bluetoothDevice);
        }
    }
    console.log(bluetoothDevices);
    info("找到周边设备有" + bluetoothDevices.size + "个");

    notifyDataSetChanged(bluetoothDevices);
}
/**
 * 启动监听设备连接,使用DeviceInformation#createWatcher 进行设备搜索
*@deprecated 
 */
function startWatch1()
{
    info("启动设备搜索");
    console.clear();
    let selector = "(System.Devices.Aep.ProtocolId:=\"{bb7bb05e-5972-42b5-94fc-76eaa7084d49}\")";
    let requestedProperties = ["System.Devices.Aep.DeviceAddress", "System.Devices.Aep.IsConnected"];
    console.log("selector", selector);
    watcher = DeviceInformation.createWatcher(selector, requestedProperties, DeviceInformationKind.associationEndpoint);
    watcher.addEventListener("add", async function (evt)
    {
        //并不能收到?
        console.log(evt);
    });
    watcher.addEventListener("removed", async function (evt)
    {
        console.log(evt);
    });
    watcher.addEventListener("updated", async function (evt)
    {
        console.log(evt);
    });
    watcher.start();
}
/**
 * 搜索低功耗蓝牙,BluetoothLEAdvertisementWatcher
 */
function startWatch()
{
    info("启动设备搜索");
    console.clear();
    devices.clear();
    clientList.innerHTML = "";

    watcher = new BluetoothLEAdvertisementWatcher();
    watcher.scanningMode = BluetoothLEScanningMode.active;
    watcher.addEventListener("received", OnAdvertisementReceived);
    watcher.start();
}
/**
 * 停止监听
 */
function stopWatch()
{
    if (watcher != null)
    {
        info("已停止设备搜索");
        watcher.stop();
        watcher = null;
    }
}
/**
 * 搜索到蓝牙设备
 * @param {Windows.Devices.Bluetooth.Advertisement.BluetoothLEAdvertisementReceivedEventArgs} evt
 */
function OnAdvertisementReceived(evt)
{
    //  console.log(evt.advertisement.localName,evt.advertisement.serviceUuids);
    let holder = devices.get(evt.bluetoothAddress);
    if (holder == null)
    {
        holder = {};

        let localNameDiv = document.createElement("span");
        localNameDiv.className = "nameDiv";
        Object.defineProperty(holder, "localName", {
            set: function (value)
            {
                localNameDiv.innerText = value; 
            }, get: function ()
            {
                return localNameDiv.innerText;
            }
        });

        let ssidDiv = document.createElement("progress");
        ssidDiv.className = "ssidDiv";
        ssidDiv.max = 128;
        Object.defineProperty(holder, "rawSignalStrengthInDBm", {
            set: function (value)
            {
                ssidDiv.value = value + 128;
                ssidDiv.title = "信号强度:" + value;
            }
        });

        let addressDiv = document.createElement("span");
        addressDiv.className = "addressDiv";
        addressDiv.innerText = evt.bluetoothAddress;
        Object.defineProperty(holder, "bluetoothAddress", {
            set: function (value)
            {
                addressDiv.innerText = "Address:" + value;
            }
        });

        let timeDiv = document.createElement("span");
        timeDiv.className = "timeDiv";
        timeDiv.innerText = evt.timestamp.toLocaleString();
        Object.defineProperty(holder, "timestamp", {
            set: function (value)
            {
                timeDiv.innerText = value.toLocaleString();
            }
        });

        let uuidList = document.createElement("div");
        uuidList.style.display = "none";

        let inputEle = document.createElement("input");
        inputEle.className = "inputDiv";
        inputEle.type = "checkbox"; 
        Object.defineProperty(holder, "connected", {
            set: function (value)
            {
                inputEle.checked = value;
            }
        });

        let itemDiv = document.createElement("div");
        itemDiv.className = "itemDiv";
        let infoDiv = document.createElement("table");

        let tr = document.createElement("tr");
        let td = document.createElement("td");
        td.setAttribute("rowspan", 3);
        td.appendChild(inputEle);
        tr.appendChild(td);

        td = document.createElement("td");
        td.appendChild(localNameDiv);
        td.appendChild(ssidDiv);
        tr.appendChild(td);
        infoDiv.appendChild(tr);

        tr = document.createElement("tr");
        td = document.createElement("td");
        td.appendChild(addressDiv);
        tr.appendChild(td);
        infoDiv.appendChild(tr);

        tr = document.createElement("tr");
        td = document.createElement("td");
        td.appendChild(timeDiv);
        tr.appendChild(td);
        infoDiv.appendChild(tr);

        itemDiv.appendChild(infoDiv);
        itemDiv.appendChild(uuidList);
        clientList.appendChild(itemDiv);

        holder.uuidList = uuidList;
        holder.detail = evt;
        holder.localName = evt.advertisement.localName;
        holder.rawSignalStrengthInDBm = evt.rawSignalStrengthInDBm;
        holder.timestamp = evt.timestamp;
        holder.bluetoothAddress = evt.bluetoothAddress;
        devices.set(evt.bluetoothAddress, holder);

        //连接低功耗设备
        inputEle.onchange = function ()
        {
            if (inputEle.checked)
            {
                connect(evt.bluetoothAddress); 
            } else
            {
                disconnect(evt.bluetoothAddress); 
            }
        }; 
       
    } else
    {
        holder.detail = evt;
        if (evt.advertisement.localName != null && evt.advertisement.localName !== "")
        {
            holder.localName = evt.advertisement.localName;
        }
        holder.bluetoothAddress = evt.bluetoothAddress;
        holder.rawSignalStrengthInDBm = evt.rawSignalStrengthInDBm;
        holder.timestamp = evt.timestamp;
    }
}
/**
 *连接到低功耗设备
 * @param {number} bluetoothAddress 蓝牙数字地址
 */
async function connect(bluetoothAddress)
{
    let holder = devices.get(bluetoothAddress);
    if (holder == null)
    {
        error("需要连接的设备不存在");
        return;
    }
    info("正在连接到:" + bluetoothAddress); 
    let device = await BluetoothLEDevice.fromBluetoothAddressAsync(bluetoothAddress); 
    holder.device = device;
    info("成功连接到:" + device.name);
    console.log(device);
    device.onconnectionstatuschanged = function ()
    {
        if (device.connectionStatus == BluetoothConnectionStatus.disconnected)
        {
            disconnect(bluetoothAddress);
        }
    };
    device.ongattserviceschanged = function (evt)
    {
        console.log(evt);
    };
    let uuids = await device.getGattServicesAsync(BluetoothCacheMode.cached); 
    notifyUUIDsChanged(holder.uuidList, uuids);
}
/**
 * 断开设备连接
 * @param {number} bluetoothAddress
 */
function disconnect(bluetoothAddress)
{
    let holder = devices.get(bluetoothAddress);
    if (holder == null)
    {
        console.log("蓝牙设备不存在", bluetoothAddress);
         //do nothing
        return;
    }
    info("已经断开设备" + holder.localName);
    holder.connected = false;
    if (holder.device != null)
    {
        holder.device.close();
        holder.device = null;
    }
    holder.uuidList.style.display = "none";
    
}
/**
 *显示uuid列表
 * @param {HTMLElement} uuidList
 * @param { Windows.Devices.Bluetooth.GenericAttributeProfile.GattDeviceServicesResult} uuids
 */
async function notifyUUIDsChanged(uuidList, uuids)
{
    console.log(uuids.services);
    uuidList.style.display = "";
    uuidList.innerHTML = "";
    uuids.services.forEach(async service =>
    {   
        let chs =await service.getCharacteristicsAsync(BluetoothCacheMode.cached);
        chs.characteristics.forEach(async ch =>
        { 
            let uuidItemDiv1 = document.createElement("label");
            uuidItemDiv1.className = "uuidItemDiv";
            uuidItemDiv1.innerHTML = "Characteristic{" + ch.uuid + "}<input name='" + service.device.bluetoothAddress+"' type='radio' />"; 
            uuidList.appendChild(uuidItemDiv1);
            uuidItemDiv1.onclick = function ()
            {
                operation = ch;
            };

            //通知授权
            if ((ch.characteristicProperties | GattCharacteristicProperties.notify) == ch.characteristicProperties)
            {
                console.log("可通知", ch);
                ch.writeClientCharacteristicConfigurationDescriptorAsync(GattClientCharacteristicConfigurationDescriptorValue.notify)
                     .then(ret =>
                     {
                         console.log("授权结果", ret);
                         if (GattCommunicationStatus.success == ret)
                         {
                             ch.addEventListener("valuechanged", async function (args)
                             {
                                 console.log(reader); 
                                 let reader = DataReader.fromBuffer(args.characteristicValue);
                                 reader.loadAsync(args.characteristicValue.length).then(size =>
                                 {
                                     let str = reader.readString(size);
                                     info("接收" + ch.uuid,str);
                                     console.log(str);
                                 }); 
                             });
                         }
                     }, err =>
                    {
                         console.log("授权错误", err);
                         error(ch.uuid+"授权错误:"+err.message);
                    });  
            }

            //
            let des =await ch.getDescriptorsAsync(BluetoothCacheMode.cached);
            des.descriptors.forEach(de =>
            {
                let uuidItemDiv2 = document.createElement("label");
                uuidItemDiv2.className = "uuidItemDiv"; 
                uuidItemDiv2.innerHTML = "Descriptor{" + de.uuid + "}<input name='" + service.device.bluetoothAddress +"'  type='radio' />";
                uuidList.appendChild(uuidItemDiv2); 
                uuidItemDiv2.onclick = function ()
                {
                    operation = de; 
                };
            });
        });  
    });
}
/**
 * 构建蓝牙显示列表
 * @param {Map<string,Windows.Devices.Bluetooth.BluetoothLEDevice>} bluetoothDevices
 * @deprecated 
 */
function notifyDataSetChanged(bluetoothDevices)
{
    //nothing
}


watchBtn.onchange = function ()
{
    if (watchBtn.checked)
    {
        startWatch();
    } else
    {
        stopWatch();
    }
};

sendBtn.onclick = function ()
{
    if (operation != null)
    {
        let msg = sendText.value;
        console.log("发送文本", msg); 
        sendMsg(operation, msg);
    }
};
/**
 *
 * @param {  Windows.Devices.Bluetooth.GenericAttributeProfile.GattDescriptor | Windows.Devices.Bluetooth.GenericAttributeProfile.GattCharacteristic } op
 * @param {string} msg
 */
async function sendMsg(op, msg)
{
    console.log(op);
    if (op != null)
    {
        var writer = new DataWriter();
        writer.writeString(msg); 
        let ret = await op.writeValueAsync(writer.detachBuffer());
        if (GattCommunicationStatus.success == ret)
        {
            info("发送" + op.uuid, msg);
        } else
        {
            error("发送失败" + op.uuid+" : "+msg);
        } 
    }
}