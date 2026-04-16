import AppleHealthKit from 'react-native-health';

describe('react-native-health mock', () => {
  it('exposes Constants.Permissions', () => {
    expect(AppleHealthKit.Constants).toBeDefined();
    expect(AppleHealthKit.Constants.Permissions.Steps).toBe('Steps');
    expect(AppleHealthKit.Constants.Permissions.ActiveEnergyBurned).toBe('ActiveEnergyBurned');
    expect(AppleHealthKit.Constants.Permissions.SleepAnalysis).toBe('SleepAnalysis');
    expect(AppleHealthKit.Constants.Permissions.Workout).toBe('Workout');
    expect(AppleHealthKit.Constants.Permissions.Weight).toBe('Weight');
    expect(AppleHealthKit.Constants.Permissions.BodyFatPercentage).toBe('BodyFatPercentage');
    expect(AppleHealthKit.Constants.Permissions.EnergyConsumed).toBe('EnergyConsumed');
    expect(AppleHealthKit.Constants.Permissions.Protein).toBe('Protein');
    expect(AppleHealthKit.Constants.Permissions.FatTotal).toBe('FatTotal');
    expect(AppleHealthKit.Constants.Permissions.Carbohydrates).toBe('Carbohydrates');
  });

  it('invokes initHealthKit callback with no error by default', (done) => {
    AppleHealthKit.initHealthKit({ permissions: { read: [], write: [] } }, (err) => {
      expect(err).toBeNull();
      done();
    });
  });

  it('invokes getStepCount callback with a HealthValue result by default', (done) => {
    AppleHealthKit.getStepCount(
      { startDate: new Date().toISOString() },
      (err, result) => {
        expect(err).toBeNull();
        expect(result).toEqual(expect.objectContaining({ value: expect.any(Number) }));
        done();
      }
    );
  });
});
