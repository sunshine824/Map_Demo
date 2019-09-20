import qs from 'qs'
import axios from 'axios'

/**
 * 封装post请求
 * @param url     请求接口
 * @param params  请求参数
 * @returns {*}
 */
export function post(url, params) {
  axios.defaults.headers.common['Authorization'] = 'Bearer ' + sessionStorage.getItem('token')

  return axios({
    method: 'post',
    url: url,
    data: qs.stringify(params)
  }).then((res) => {
    return Promise.resolve(res.data)
  })
}

/**
 * 封装get请求
 * @param url      请求接口
 * @param params   请求参数
 * @returns {Promise<T>}
 */
export function get(url, params) {

  return axios.get(
    url, {
      params: params
    }).then(res => {
      return Promise.resolve(res.data)
    })
}

axios.defaults.baseURL = '';
//请求返回拦截
axios.interceptors.response.use((response) => {
  //特殊错误处理，状态为10时为登录超时
  if (response.data.code === 300) {

    //其余错误状态处理
  } else if (response.data.code != 200) {

    //请求成功
  } else if (response.data.code === 200) {
    //将我们请求到的信息返回页面中请求的逻辑
    return response;
  }
}, function (error) {
  return Promise.reject(error);
});
