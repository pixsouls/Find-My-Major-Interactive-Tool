import * as ort from 'onnxruntime-node';

const session = await ort.InferenceSession.create('../Frontend/public/ml/riasec_model.onnx');

const testInput = Float32Array.from([0.8, 0.5, 0.2, 0.3, 0.1, 0.4]);
const inputTensor = new ort.Tensor('float32', testInput, [1, 6]);

// only fetch output_label
const results = await session.run(
  { float_input: inputTensor },
  ['output_label']
);

console.log('output_label data:', results['output_label'].data);
console.log('output_label dims:', results['output_label'].dims);
console.log('output_label type:', results['output_label'].type);
