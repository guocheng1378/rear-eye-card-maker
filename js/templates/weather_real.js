import { escXml } from '../maml.js';

export default {
  id: 'weather_real', icon: '🌤️', name: '天气卡片', desc: '绑定系统天气数据，实时显示',
  updater: 'DateTime.Hour,DateTime.Minute',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '天气卡片' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#0a1628' },
      { key: 'bgImage', label: '背景图 URL 或上传', type: 'text', default: '' },
    ]},
    { group: '样式', fields: [
      { key: 'timeColor', label: '时间颜色', type: 'color', default: '#ffffff' },
      { key: 'tempColor', label: '温度颜色', type: 'color', default: '#ffffff' },
      { key: 'tempSize', label: '温度字号', type: 'range', min: 36, max: 80, default: 56 },
      { key: 'descColor', label: '描述颜色', type: 'color', default: '#aaaaaa' },
      { key: 'accentColor', label: '强调色', type: 'color', default: '#4fc3f7' },
    ]},
  ],
  rawXml(c) {
    var ts = c.tempSize || 56;
    return '<Widget screenWidth="976" frameRate="0" scaleByDensity="false" useVariableUpdater="DateTime.Hour,DateTime.Minute" name="' + escXml(c.cardName || '天气卡片') + '">\n' +
    '  <VariableBinders>\n' +
    '    <ContentProviderBinder name="weather_version_provider" uri="content://weather/weatherVersionData" columns="weather_version">\n' +
    '      <Variable name="weather_version" type="string" column="weather_version" />\n' +
    '    </ContentProviderBinder>\n' +
    '    <ContentProviderBinder name="weather_provider" uriFormat="content://weather/weatherData/4/%s" uriParas="@localId" columns="city_id,temperature,weather_type,description,city_name,tmphighs,tmplows" countName="hasweather">\n' +
    '      <Variable name="cityId" type="string" column="city_id" />\n' +
    '      <Variable name="weather_location" type="string" column="city_name" />\n' +
    '      <Variable name="weather_id" type="int" column="weather_type" />\n' +
    '      <Variable name="weather_temperature" type="int" column="temperature" />\n' +
    '      <Variable name="weather_description" type="string" column="description" />\n' +
    '      <Variable name="weather_temphigh" type="string[]" column="tmphighs" />\n' +
    '      <Variable name="weather_templow" type="string[]" column="tmplows" />\n' +
    '    </ContentProviderBinder>\n' +
    '  </VariableBinders>\n' +
    '  <Var name="marginL" type="number" expression="(#view_width * 0.30)" />\n' +
    '\n' +
    '  <!-- 背景 -->\n' +
    '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />\n' +
    '\n' +
    '  <!-- 天气内容组 -->\n' +
    '  <Group name="weather_content" x="#marginL" y="0" w="(#view_width - #marginL - 40)">\n' +
    '    <DateTime name="weather_time" x="0" y="40" color="' + c.timeColor + '" size="72" format="HH:mm" fontFamily="mipro-demibold" align="left" />\n' +
    '    <DateTime name="weather_date" x="0" y="120" color="' + c.descColor + '" size="22" format="MM月dd日 E" fontFamily="mipro-normal" align="left" />\n' +
    '    <Text x="0" y="200" color="' + c.tempColor + '" size="' + ts + '" textExp="concat(@weather_temperature, \'°\')" bold="true" fontFamily="mipro-demibold" />\n' +
    '    <Text x="0" y="' + (200 + ts + 10) + '" color="' + c.descColor + '" size="20" textExp="concat(@weather_location, \' · \', @weather_description)" fontFamily="mipro-normal" />\n' +
    '    <Text x="0" y="' + (200 + ts + 50) + '" color="' + c.descColor + '" size="16" textExp="concat(\'最高 \', @weather_temphigh[0], \'°  最低 \', @weather_templow[0], \'°\')" fontFamily="mipro-normal" />\n' +
    '  </Group>\n' +
    '</Widget>';
  },
};
