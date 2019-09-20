import Map from './Map.Setting'
import * as Utils from './Map.Util'

const Init = {
    init(opt_options) {
        const options = opt_options || {}
        //地图渲染节点
        const targetID = options.target;
        let layers = [
            new ol.layer.Tile({
                title: '中国地图',
                source: new ol.source.XYZ({
                    url: Map.urlServer,
                })
            })
        ]

        //地图初始化图层
        const initLayers = options.layers ? layers.concat(options.layers) : layers;
        //地图渲染方式
        const render = options.renderer || 'canvas'

        const center = options.view ? options.center : Map.defaultCenter;
        const zoom = options.view ? options.zoom : Map.defaultZoom;
        const projection = options.projection || Map.projection
        const maxZoom = options.maxZoom || Map.maxZoom
        const minZoom = options.minZoom || Map.minZoom

        const initView = new ol.View({
            projection: projection,
            center: center,
            zoom: zoom,
            maxZoom: maxZoom,
            minZoom: minZoom,
        })

        const attribution = new ol.control.Attribution({
            collapsible: false
        });
        //地图初始控件
        const mp = new ol.control.MousePosition({
            coordinateFormat: ol.coordinate.toStringHDMS()
        });

        const initControls = options.controls
            || (ol.control.defaults({ attribution: false }).extend([
                new ol.control.ScaleLine(),
                new ol.control.ZoomSlider({}),
                new ol.control.MousePosition({
                    coordinateFormat: function (coordinate) {
                        const points = coordinate
                        return `东经${points[0]} 北纬${points[1]}`
                    }
                }), new ol.control.OverviewMap({
                    collapsed: true,
                    layers: initLayers,
                    view: new ol.View({
                        projection: Map.projection
                    }),
                    collapseLabel: '\u00BB',
                    label: '\u00AB'
                })
            ]));

        //构造地图
        const map = new ol.Map({
            target: targetID,
            layers: initLayers,
            renderer: render,
            view: initView,
            controls: initControls,
            loadTilesWhileAnimating: true,
            loadTilesWhileInteracting: true,
            interactions: new ol.interaction.defaults({
                doubleClickZoom: false
            })
        })

        map.on('click', (evt) => {
            if (map.hasFeatureAtPixel(evt.pixel)) {
                let feature = map.forEachFeatureAtPixel(evt.pixel, (feature) => {
                    if (feature.type == 'target' || feature.type == 'personal') {
                        return feature
                    }
                })
                if (feature) {
                    options.success && options.success(feature)
                }
            }
        })

        //监听zoom放大缩小
        map.on('moveend', (evt) => {
            let zoom = map.getView().getZoom();
            options.changeZoom && options.changeZoom({
                zoom,
                points: this.getExtentPoint(map)
            })
        })

        Map.map = map
    },

    getExtentPoint: (map) => {
        const extent = map.getView().calculateExtent(map.getSize())
        const [minX, minY, maxX, maxY] = extent
        const leftTop = Utils.tranEPSG4326([minX, maxY])
        const rightTop = Utils.tranEPSG4326([maxX, maxY])
        const rightBottom = Utils.tranEPSG4326([maxX, minY])
        const leftBottom = Utils.tranEPSG4326([minX, minY])
        return [leftTop, leftBottom, rightBottom, rightTop, leftTop]
    }
}

Map.Init = Init

export default Init;