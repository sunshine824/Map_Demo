import { ALLIMGS } from '../Const'
import { urls } from "../../../../static/urlConfig";

const Map = {
    urlServer: "http://mt2.google.cn/vt/lyrs=y&hl=zh&gl=zh&src=app&x={x}&y={y}&z={z}&s=G",
    //urlServer:"http://www.google.cn/maps/vt/pb=!1m4!1m3!1i{z}!2i{x}!3i{y}!2m3!1e0!2sm!3i380072576!3m8!2szh!3szh!5e1105!12m4!1e68!2m2!1sset!2sRoadmap!4e0!5m1!1e0",
    //urlServer: "http://wprd0{1-4}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&style=7&x={x}&y={y}&z={z}",
    url: {
        WMSURL: urls.geoserver + '/geoserver/htth_basemap/wms',
    },
    defaultZoom: 12,
    defaultCenter: [87.614936, 43.222961],
    //defaultCenter: [104.0742478421, 30.6613265616],
    serverType: 'geoserver',
    layer: {},
    projection: 'EPSG:4326',
    maxZoom: 19,
    minZoom: 2,
    extent: [-22123932000.494588217, -117407.27544603143, 22123932000.494588217, 8000000.27544603143],
    //飞机状态图片
    allImgs: ALLIMGS
}

export default Map