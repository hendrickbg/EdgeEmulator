import matplotlib.pyplot as plt
import numpy as np

# Generate some data
x = np.linspace(0, 10, 100)
y1 = np.sin(x)
y2 = np.cos(x)

# Create main figure and subplots with squared aspect ratio
fig, axs = plt.subplots(2, 2, figsize=(8, 8))

# Plot data on subplots
axs[0, 0].plot(x, y1, color='blue')
axs[0, 0].set_title('Subplot 1')
axs[0, 0].axhline(0, color='black', linewidth=0.5)  # Add horizontal line at y=0
axs[0, 0].axvline(0, color='black', linewidth=0.5)  # Add vertical line at x=0

axs[0, 1].plot(x, y2, color='red')
axs[0, 1].set_title('Subplot 2')
axs[0, 1].axhline(0, color='black', linewidth=0.5)
axs[0, 1].axvline(0, color='black', linewidth=0.5)

axs[1, 0].hist(y1, bins=20, color='green')
axs[1, 0].set_title('Subplot 3')
axs[1, 0].axhline(0, color='black', linewidth=0.5)
axs[1, 0].axvline(0, color='black', linewidth=0.5)

axs[1, 1].hist(y2, bins=20, color='orange')
axs[1, 1].set_title('Subplot 4')
axs[1, 1].axhline(0, color='black', linewidth=0.5)
axs[1, 1].axvline(0, color='black', linewidth=0.5)

# Adjust layout
plt.tight_layout()

# Save plot as PNG
plt.savefig('general_chart_with_axes_lines.png')

# Show plot
plt.show()
