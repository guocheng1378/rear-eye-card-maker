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
    var lines = [];
    lines.push('<Widget screenWidth="976" frameRate="0" scaleByDensity="false" useVariableUpdater="DateTime.Hour,DateTime.Minute" name="' + escXml(c.cardName || '天气卡片') + '">');
    lines.push('  <Var name="marginL" type="number" expression="(#view_width * 0.30)" />');
    lines.push('');
    lines.push('  <!-- 天气数据绑定 -->');
    lines.push('  <VariableBinders>');
    lines.push('    <ContentProviderBinder name="weather_version_provider" uri="content://weather/weatherVersionData" columns="weather_version">');
    lines.push('      <Variable name="weather_version" type="string" column="weather_version" />');
    lines.push('    </ContentProviderBinder>');
    lines.push('    <ContentProviderBinder name="weather_provider" uriFormat="content://weather/weatherData/4/%s" uriParas="@localId" columns="city_id,temperature,weather_type,description,city_name,tmphighs,tmplows" countName="hasweather">');
    lines.push('      <Variable name="cityId" type="string" column="city_id" />');
    lines.push('      <Variable name="weather_location" type="string" column="city_name" />');
    lines.push('      <Variable name="weather_id" type="int" column="weather_type" />');
    lines.push('      <Variable name="weather_temperature" type="int" column="temperature" />');
    lines.push('      <Variable name="weather_description" type="string" column="description" />');
    lines.push('      <Variable name="weather_temphigh" type="string[]" column="tmphighs" />');
    lines.push('      <Variable name="weather_templow" type="string[]" column="tmplows" />');
    lines.push('    </ContentProviderBinder>');
    lines.push('  </VariableBinders>');
    lines.push('');
    lines.push('  <!-- 背景 -->');
    lines.push('  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />');
    lines.push('');
    lines.push('  <!-- 天气内容组 -->');
    lines.push('  <Group name="weather_content" x="#marginL" y="0" w="(#view_width - #marginL - 40)">');
    lines.push('    <Text x="0" y="40" size="72" color="' + c.timeColor + '" textExp="formatDate(\'HH:mm\', #time_sys)" bold="true" fontFamily="mipro-demibold" />');
    lines.push('    <Text x="0" y="120" size="22" color="' + c.descColor + '" textExp="formatDate(\'MM月dd日 E\', #time_sys)" />');
    lines.push('    <Text x="0" y="200" size="' + ts + '" color="' + c.tempColor + '" textExp="concat(@weather_temperature, \'°\')" bold="true" fontFamily="mipro-demibold" />');
    lines.push('    <Text x="0" y="' + (200 + ts + 10) + '" size="20" color="' + c.descColor + '" textExp="concat(@weather_location, \' · \', @weather_description)" />');
    lines.push('    <Text x="0" y="' + (200 + ts + 50) + '" size="16" color="' + c.descColor + '" textExp="concat(\'最高 \', @weather_temphigh[0], \'°  最低 \', @weather_templow[0], \'°\')" />');
    lines.push('  </Group>');
    lines.push('</Widget>');

    return lines.join('\n');
  },
};
