"""Export the uploaded model's checkpoint and reference predictions for JS checks.

Run from this directory after: python ../mnist_train.py
"""
import ast
import json
from pathlib import Path
import torch
from torch import nn
from torchvision import datasets, transforms

torch.set_num_threads(4)
here = Path(__file__).resolve().parent
source = ast.parse((here.parent / 'mnist_train.py').read_text(encoding='utf-8'))
model_class = next(n for n in source.body if isinstance(n, ast.ClassDef) and n.name == 'MNISTCNN')
namespace = {'nn': nn}
exec(compile(ast.Module(body=[model_class], type_ignores=[]), 'mnist_train.py', 'exec'), namespace)
model = namespace['MNISTCNN']()
state = torch.load(here / 'mnist.pt', map_location='cpu', weights_only=True)
model.load_state_dict(state)
model.eval()
offset = 0
tensors = {}
with (here / 'weights.bin').open('wb') as f:
    for name, value in state.items():
        a = value.numpy().astype('<f4')
        tensors[name] = {'offset': offset, 'length': a.size, 'shape': list(a.shape)}
        f.write(a.tobytes())
        offset += a.size
test = datasets.MNIST(here / 'data', train=False, download=False, transform=transforms.ToTensor())
correct = 0
with torch.no_grad():
    for images, labels in torch.utils.data.DataLoader(test, batch_size=256):
        correct += (model(images).argmax(1) == labels).sum().item()
    samples = []
    for i in range(100):
        image, label = test[i]
        samples.append({'label': label, 'pixels': image.flatten().tolist(), 'logits': model(image.unsqueeze(0))[0].tolist()})
meta = {'source': 'mnist_train.py', 'architecture': 'MNISTCNN', 'epochs': 5,
        'train_size': 55000, 'validation_size': 5000, 'best_validation_accuracy': 98.56,
        'test_size': len(test), 'test_accuracy': 100 * correct / len(test), 'tensors': tensors}
(here / 'model.json').write_text(json.dumps(meta, indent=2) + '\n')
(here / 'reference.json').write_text(json.dumps(samples))
print(f'Exported {offset} parameters; test accuracy: {meta["test_accuracy"]:.2f}%')
