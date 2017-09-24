let connectBtn = document.getElementById("connectBtn");
let clientList = document.getElementById("clientList");
let msgText = document.getElementById("msgText");
let sendText = document.getElementById("sendText");
let sendBtn = document.getElementById("sendBtn");
let connectText = connectBtn.parentElement.childNodes[1];
//导入包
let { BluetoothCacheMode, BluetoothDevice } = Windows.Devices.Bluetooth;
let { RfcommDeviceService, RfcommServiceId } = Windows.Devices.Bluetooth.Rfcomm;
let { DeviceInformation } = Windows.Devices.Enumeration;
let { StreamSocket, SocketProtectionLevel } = Windows.Networking.Sockets;
let { DataWriter, DataReader, UnicodeEncoding } = Windows.Storage.Streams;
/**
 * 一些常量
 */
const Constants = {
    RfcommServiceUuid: RfcommServiceId.fromUuid("00000000-0000-0000-8ac5-7d35847d5158"),
    //RfcommServiceUuid: RfcommServiceId.obexObjectPush, 
    ServiceName: "My Win1o BLE"
};

let socket;
let writer;
//查找蓝牙设备
async function search()
{
    console.clear();
    connectBtn.setAttribute("disabled", true);

    //  RfcommDeviceService.getDeviceSelector.getDeviceSelector(Constants.RfcommServiceUuid);
    let selector = BluetoothDevice.getDeviceSelector();
    console.log("selector", selector);
    let devices = await DeviceInformation.findAllAsync(selector);
    console.log("devices", devices);
    info("正在搜索周边设备...");
    let bluetoothDevices = new Map();
    for (const device of devices)
    {
        let bluetoothDevice = await BluetoothDevice.fromIdAsync(device.id);
        if (bluetoothDevice != null)
        {
            //console.log(bluetoothDevice);
            bluetoothDevices.set(bluetoothDevice.deviceId, bluetoothDevice);
        }
    }
    console.log(bluetoothDevices);
    info("找到周边设备有" + bluetoothDevices.size + "个");

    notifyDataSetChanged(bluetoothDevices);

}
/**
 * 构建蓝牙显示列表
 * @param {Map<string,Windows.Devices.Bluetooth.BluetoothDevice>} bluetoothDevices
 */
function notifyDataSetChanged(bluetoothDevices)
{
    connectBtn.removeAttribute("disabled");

    if (bluetoothDevices.size > 0)
    {
        clientList.className = "_left";
        msgText.className = "_right";
        clientList.innerHTML = "";

        bluetoothDevices.forEach(bluetoothDevice =>
        {
            console.log(bluetoothDevice);
            let itemDiv = document.createElement("div");
            let nameDiv = document.createElement("div");
            nameDiv.className = "itemDiv";
            nameDiv.innerText = bluetoothDevice.name + "" + bluetoothDevice.hostName;
            itemDiv.appendChild(nameDiv);
            clientList.appendChild(itemDiv);

            bluetoothDevice.getRfcommServicesAsync(BluetoothCacheMode.uncached).then(result =>
            {
                console.log("返回服务", result);
                for (const rfcommService of bluetoothDevice.rfcommServices)
                {
                    let inputDiv = document.createElement("div");
                    inputDiv.className = "itemLabel";
                    let inputEle = document.createElement("label");
                    inputEle.innerHTML = rfcommService.serviceId.asString() + "<input name='rfcommService' type='radio' />";
                    inputDiv.appendChild(inputEle);
                    itemDiv.appendChild(inputDiv);

                    inputDiv.onclick = function ()
                    {
                        clientList.className = "left";
                        msgText.className = "right";
                        connect(rfcommService);
                    };
                }
            });

        });
    }
}
/**
 * 连接到指定服务
 * @param {Windows.Devices.Bluetooth.Rfcomm.RfcommDeviceService} rfcommService
 */
async function connect(rfcommService)
{
    console.log(rfcommService);
    connectText.textContent = "已连接到" + rfcommService.device.name + rfcommService.device.hostName;
    info("正在连接到 " + rfcommService.serviceId.uuid + " ...");
    socket = new StreamSocket();
    try
    {
        await socket.connectAsync(rfcommService.connectionHostName, rfcommService.connectionServiceName, SocketProtectionLevel.bluetoothEncryptionAllowNullAuthentication);
        info("连接成功");
    } catch (e)
    {
        console.log(e);
        error("不能连接到服务端!");
        connectText.textContent = "搜索设备";
        connectBtn.checked = false;
        socket = null;
        return;
    }
    writer = new DataWriter(socket.outputStream);
    let reader = new DataReader(socket.inputStream);
    //迭代循环读取
    function run()
    {
        reader.loadAsync(4).then(len =>
        {
            let size = reader.readInt32();//抛出异常处理 
            return size;
        }).then(size =>
        {
            console.log(size);
            return reader.loadAsync(size);
        }).then(textLen =>
        {
            console.log("文本长度:" + textLen);
            let str = reader.readString(textLen);
            return str;
        }).then(str =>
        {
            console.log(str);
            info("服务器", str);
            run();
        }, err =>
            {
                console.log(err);
                disconnect();
            });
    }
    run();
}
/**
 *判断是否为蓝牙设备
 * @param {Windows.Devices.Enumeration.DeviceInformation} device
 */
async function isBluetoothDevice(device)
{
    //device.id.indexOf("BTHENUM") > 0
    let b = await BluetoothDevice.fromIdAsync(device.id);
    return b != null;
}

function disconnect()
{
    console.log("断开连接");
    connectText.textContent = "搜索设备";
    connectBtn.checked = false;
    if (socket != null)
    {
        info("断开连接");
        socket.close();
        socket = null;
    }
    if (writer != null)
    {
        writer.close();
        writer = null;
    }
}

connectBtn.onchange = function ()
{
    if (connectBtn.checked)
    {
        if (connectText.textContent == "搜索设备")
        {
            search();
        }
    } else
    {
        if (connectText.textContent == "搜索设备")
        {
            //隐藏设备列表
            clientList.className = "left";
            msgText.className = "right";
        } else  //断开连接
        {
            disconnect();
        }
    }
};
sendBtn.onclick = function ()
{
    if (writer != null)
    { 
        let msg = sendText.value;
        console.log("发送文本", msg);
        info("客户端", msg);
        sendMsg(writer, msg);
    }
};
/**
 * 
 * @param {Windows.Storage.Streams.DataWriter} writer
 * @param {string} msg
 */
function sendMsg(writer, msg)
{
    if (writer != null)
    {
        let textLen = writer.measureString(msg);
        console.log("写入长度:" + textLen);
        writer.writeInt32(textLen);
        writer.writeString(msg);
        writer.storeAsync();
    } 
}