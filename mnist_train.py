
import torch
from torch import nn
from torch.utils.data import DataLoader, random_split
from torchvision import datasets, transforms

# Device
device = torch.device(
    "cuda" if torch.cuda.is_available()
    else "cpu"
)

print(f"Device: {device}")

# Dataset
transform = transforms.ToTensor()

full_train = datasets.MNIST(
    root="./data",
    train=True,
    download=True,
    transform=transform
)

test_dataset = datasets.MNIST(
    root="./data",
    train=False,
    download=True,
    transform=transform
)

train_dataset, val_dataset = random_split(
    full_train,
    [55000, 5000],
    generator=torch.Generator().manual_seed(42)
)

train_loader = DataLoader(
    train_dataset, batch_size=128, shuffle=True
)

val_loader = DataLoader(
    val_dataset, batch_size=128
)

test_loader = DataLoader(
    test_dataset, batch_size=128
)


# CNN Model
class MNISTCNN(nn.Module):
    def __init__(self):
        super().__init__()

        self.features = nn.Sequential(
            nn.Conv2d(1, 16, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),

            nn.Conv2d(16, 32, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2)
        )

        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(32 * 7 * 7, 64),
            nn.ReLU(),
            nn.Linear(64, 10)
        )

    def forward(self, x):
        x = self.features(x)
        x = self.classifier(x)
        return x


# Evaluation
def evaluate(model, loader):
    model.eval()

    correct = 0
    total = 0

    with torch.no_grad():
        for images, labels in loader:
            images = images.to(device)
            labels = labels.to(device)

            outputs = model(images)
            predictions = outputs.argmax(dim=1)

            correct += (predictions == labels).sum().item()
            total += labels.size(0)

    return 100 * correct / total


# Training
def main():
    torch.manual_seed(42)

    model = MNISTCNN().to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(
        model.parameters(), lr=0.001
    )

    epochs = 5
    best_accuracy = 0.0

    for epoch in range(epochs):
        model.train()
        total_loss = 0.0

        for images, labels in train_loader:
            images = images.to(device)
            labels = labels.to(device)

            optimizer.zero_grad()

            outputs = model(images)
            loss = criterion(outputs, labels)

            loss.backward()
            optimizer.step()

            total_loss += loss.item()

        val_accuracy = evaluate(model, val_loader)

        print(
            f"Epoch [{epoch+1}/{epochs}] "
            f"Loss: {total_loss / len(train_loader):.4f} "
            f"Val Acc: {val_accuracy:.2f}%"
        )

        if val_accuracy > best_accuracy:
            best_accuracy = val_accuracy
            torch.save(model.state_dict(), "mnist.pt")

    # Test the best model
    model.load_state_dict(
        torch.load(
            "mnist.pt",
            map_location=device,
            weights_only=True
        )
    )

    test_accuracy = evaluate(model, test_loader)

    print(f"\nBest Validation Accuracy: {best_accuracy:.2f}%")
    print(f"Test Accuracy: {test_accuracy:.2f}%")
    print("Model saved to mnist.pt")


if __name__ == "__main__":
    main()
