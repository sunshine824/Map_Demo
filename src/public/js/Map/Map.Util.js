import Map from './Map.Setting'

//转换成国际坐标系
export const tranEPSG4326 = (point) => {
  return ol.proj.transform(point, 'EPSG:3857', 'EPSG:4326')
}

//转换成google坐标系
export const tranEPSG3857 = (point) => {
  return ol.proj.transform(point, 'EPSG:4326', 'EPSG:3857')
}

//测距
export const getLength = (geometry, opt) => {
  opt = opt || { projection: "EPSG:4326", radius: 6371008.8 };
  //FIXME 平面坐标 计算方式
  let length = ol.sphere.getLength(geometry, opt);
  let output;
  if (length > 1000) {
    output = (Math.round(length / 1000 * 100) / 100) + ' ' + 'km'; //换算成KM单位
  } else {
    output = (Math.round(length * 100) / 100) + ' ' + 'm'; //m为单位
  }
  return output;
}

//测面
export const getArea = (geometry, opt) => {
  opt = opt || { projection: "EPSG:4326", radius: 6371008.8 };
  //FIXME 平面坐标 计算方式
  let area = ol.sphere.getArea(geometry, opt);
  let output;
  if (area > 10000) {
    output =
      Math.round((area / 1000000) * 100) / 100 + " " + "km<sup>2</sup>";
  } else {
    output = Math.round(area * 100) / 100 + " " + "m<sup>2</sup>";
  }
  return output;
}

//删除元素
export function remove(selectors) {
  selectors.removeNode = [];
  if (selectors.length != undefined) {
    var len = selectors.length;
    for (var i = 0; i < len; i++) {
      selectors.removeNode.push({
        parent: selectors[i].parentNode,
        inner: selectors[i].outerHTML,
        next: selectors[i].nextSibling
      });
    }
    for (var i = 0; i < len; i++)
      selectors[0].parentNode.removeChild(selectors[0]);
  } else {
    selectors.removeNode.push({
      parent: selectors.parentNode,
      inner: selectors.outerHTML,
      next: selectors.nextSibling
    });
    selectors.parentNode.removeChild(selectors);
  }
}


export const creatGeoServerLayer = function (config) {
  const { layer, url, CQL_FILTER, title } = config
  const wmsParam = {
    'LAYERS': layer,
    'VERSION': '1.1.0'
  }
  if (CQL_FILTER) {
    wmsParam.CQL_FILTER = CQL_FILTER
  }
  return new ol.layer.Tile({
    visible: false,
    title: title,
    source: new ol.source.TileWMS({
      url: url,
      params: wmsParam,
      serverType: Map.serverType,
    })
  })
}

//放大
export const zoomOut = () => {
  console.log(Map)
  const view = Map.map.getView();
  view.setZoom(view.getZoom() + 1);
}

//缩小
export const zoomIn = () => {
  const view = Map.map.getView();
  view.setZoom(view.getZoom() - 1);
}