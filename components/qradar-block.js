polarity.export = PolarityComponent.extend({
  details: Ember.computed.alias('block.data.details'),
  isHighSeverity: Ember.computed('details.severity', function () {
    return this.get('details.severity') > 5;
  }),
  timezone: Ember.computed('Intl', function () {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  })
});
