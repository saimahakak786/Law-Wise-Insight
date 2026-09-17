import AsyncStorage from '@react-native-async-storage/async-storage';

const DICTATION_LIMIT = 3;
const CLIENT_INTAKE_LIMIT = 1;

export const checkDictationLimit = async (): Promise<boolean> => {
  try {
    const countStr = await AsyncStorage.getItem('free_dictation_count');
    const count = countStr ? parseInt(countStr, 10) : 0;
    return count < DICTATION_LIMIT;
  } catch (e) {
    return true; 
  }
};

export const incrementDictationCount = async () => {
  try {
    const countStr = await AsyncStorage.getItem('free_dictation_count');
    const count = countStr ? parseInt(countStr, 10) : 0;
    await AsyncStorage.setItem('free_dictation_count', (count + 1).toString());
  } catch (e) {
    console.error('Error updating dictation count', e);
  }
};

export const checkClientIntakeLimit = async (): Promise<boolean> => {
  try {
    const countStr = await AsyncStorage.getItem('free_client_intake_count');
    const count = countStr ? parseInt(countStr, 10) : 0;
    return count < CLIENT_INTAKE_LIMIT;
  } catch (e) {
    return true;
  }
};

export const incrementClientIntakeCount = async () => {
  try {
    const countStr = await AsyncStorage.getItem('free_client_intake_count');
    const count = countStr ? parseInt(countStr, 10) : 0;
    await AsyncStorage.setItem('free_client_intake_count', (count + 1).toString());
  } catch (e) {
    console.error('Error updating client intake count', e);
  }
};
