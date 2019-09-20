import Map from './Map.Setting'
import { tranEPSG3857 } from "./Map.Util";

// const heatMapdata = {
//     type: "FeatureCollection",
//     features: [
//         { type: "Point", coordinates: [11579012.559639914, 3503549.743504374], count: 100 },
//         { type: "Point", coordinates: [12579012.659639914, 4503549.843504374], count: 100 },
//         { type: "Point", coordinates: [13579012.759639914, 5503549.943504374], count: 100 },
//         { type: "Point", coordinates: [14579012.859639914, 6503549.043504374], count: 100 }
//     ]
// }

const HeatMap = {
    layer: null,
    /**
     * 初始化轨迹图层
     */
    init() {
        let layer = new ol.layer.Heatmap({
            id: "headMap",
            source: new ol.source.Vector(),
            blur: 15,
            radius: 5,
            shandow:500
        })
        Map.map.addLayer(layer)
        this.layer = layer
    },
    loadData(heatMapdata){
        this.layer.getSource().clear()
        const max_count = Math.max.apply(Math,heatMapdata.features.map(item => item.count))

        heatMapdata.features.forEach(item =>{            
            item.weight =  (item.count / max_count).toFixed(2)
            item.coordinates = tranEPSG3857(item.coordinates)
        })
        
        const features =(new ol.format.GeoJSON()).readFeatures(heatMapdata,{
            dataProjection:'EPSG:3857',
            featureProjection:'EPSG:3857'
        })
        this.layer.getSource().addFeatures(features)

    },
    clear(){
        this.layer.getSource().clear()
    }
}

Map.HeatMap = HeatMap

export default HeatMap