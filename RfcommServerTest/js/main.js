let startBtn = document.getElementById("startBtn");
let clientList = document.getElementById("clientList");
let msgText = document.getElementById("msgText");
let sendText = document.getElementById("sendText");
let sendBtn = document.getElementById("sendBtn");
let startText = startBtn.parentElement.childNodes[1];

// 导入包
let Bluetooth = Windows.Devices.Bluetooth;
let BluetoothDevice = Bluetooth.BluetoothDevice;
let { RfcommDeviceService, RfcommServiceId, RfcommServiceProvider } = Bluetooth.Rfcomm;
let { DeviceInformation } = Windows.Devices.Enumeration;
let { StreamSocketListener, SocketProtectionLevel } = Windows.Networking.Sockets;
let { DataWriter, DataReader, UnicodeEncoding } = Windows.Storage.Streams;

/**
 * 一些常量
 */
const Constants = {
    RfcommServiceUuid: RfcommServiceId.fromUuid("58517d84-357d-c58a-0000-000000000000"),
    //  RfcommServiceUuid: RfcommServiceId.obexObjectPush,
    SdpServiceNameAttributeId: 0x100,
    SdpServiceNameAttributeType: (4 << 3) | 5,
    SdpServiceName: "My Win1o BLE"
};

/**RFCOMM 服务**/
let provider;
/**StreamSocketListener**/
let listener;
/**客户端Map**/
let clients = {};
/**
 * 初始化,创建一个 RfcommServiceProvider 以播发所需的服务
 */
async function connect()
{
    info("正在开启服务...");
    startBtn.setAttribute("disabled", true);

    console.clear();
    console.log("初始化");
    //
    console.log("obexObjectPush", RfcommServiceId.obexObjectPush.uuid);
    // 
    provider = await RfcommServiceProvider.createAsync(Constants.RfcommServiceUuid);
    console.log("provider", provider);
    info("服务uuid", provider.serviceId.uuid);
    listener = new StreamSocketListener();
    listener.addEventListener("connectionreceived", onConnectionreceived);
    console.log("绑定");
    info("绑定套字连接...");
    try
    {
        await listener.bindServiceNameAsync(provider.serviceId.asString(), SocketProtectionLevel.bluetoothEncryptionAllowNullAuthentication);
        info("设置Sdp属性...");
        setSdpAttributes(provider);
        provider.startAdvertising(listener, true);
    } catch (e)
    {
        console.log(e);
        error("启动服务失败", e.message);
        disconnect();
        return;
    }
    info("已启动服务");
    startBtn.removeAttribute("disabled");
}
/**
 * 设置 SDP 属性（使用 established data helpers 生成该属性的数据）
 * @param { Windows.Devices.Bluetooth.Rfcomm.RfcommServiceProvider} provider
 */
function setSdpAttributes(provider)
{
    let sdpWriter = new DataWriter();
    sdpWriter.writeByte(Constants.SdpServiceNameAttributeType);
    sdpWriter.writeByte(Constants.SdpServiceName.length);
    sdpWriter.unicodeEncoding = UnicodeEncoding.utf8;
    sdpWriter.writeString(Constants.SdpServiceName);
    provider.sdpRawAttributes.insert(Constants.SdpServiceNameAttributeId, sdpWriter.detachBuffer());
}
/**
 * 监听客户端连接
 * @param {Windows.Networking.Sockets.StreamSocketListenerConnectionReceivedEventArgs} evt
 */
async function onConnectionreceived(evt)
{
    console.log(evt);
    let socket;
    try
    {
        socket = evt.socket;
    } catch (e)
    {
        console.log(e);
        disconnect();
        return;
    }

    console.log("socket连接", socket);
    let information = socket.information;
    info(information.remoteAddress + "  正在接入...");
    let remoteDevice = await BluetoothDevice.fromHostNameAsync(information.remoteHostName);//获取实际设备名
    console.log(remoteDevice);
    let holder = clients[information.remoteAddress];
    if (holder == null)//添加元素
    {
        holder = {};
        let ele = document.createElement("div");
        ele.className = "clientItem";
        ele.innerHTML = "<span>" + remoteDevice.name + "</span><span>" + information.remoteAddress + "</span><input  type=\"checkbox\" />";
        clientList.appendChild(ele);

        holder.socket = socket;
        holder.ele = ele;
        holder.name = remoteDevice.name;
        Object.defineProperty(holder, "isSelected", {
            get:
            function ()
            {
                return ele.querySelector("input").checked;
            }
        });
        holder.writer = new DataWriter(socket.outputStream);
        clients[information.remoteAddress] = holder;
    } else//更新元素
    {
        //do noting
    }
    let reader = new DataReader(socket.inputStream);
    //断开异常处理
    let errFun = function (igr)
    {
        console.log(igr);
        //断开连接
        info(holder.name + "断开连接..");
        delete clients[information.remoteAddress];
        clientList.removeChild(holder.ele);
    };
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
            info(holder.name, str);
            run();
        }, errFun);
    }
    run();
}
function disconnect()
{
    startBtn.removeAttribute("disabled");
    startBtn.checked = false;

    for (mac in clients)
    {
        let holder = clients[mac];
        holder.socket.close();
    }
    if (listener != null)
    {
        info("服务已经断开");

        listener.close();
        listener = null;
    }
    if (provider != null)
    {
        provider.stopAdvertising();
        provider = null;
    }
}

startBtn.onchange = function ()
{
    if (startBtn.checked)
    {
        connect();
    } else
    {
        disconnect();
    }
};
sendBtn.onclick = function ()
{
    let msg = sendText.value;
    console.log("发送文本", msg);
    info("服务器", msg);
    for (mac in clients)
    {
        let holder = clients[mac];
        if (holder.isSelected)
        {
            let writer = holder.writer;
            sendMsg(writer, msg);
        }
    }
}
/**
 * 
 * @param {Windows.Storage.Streams.DataWriter} writer
 * @param {string} msg
 */
function sendMsg(writer, msg)
{
    let textLen = writer.measureString(msg);
    console.log("写入长度:" + textLen);
    writer.writeInt32(textLen);
    writer.writeString(msg);
    writer.storeAsync();
}