import psutil
import matplotlib
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
from collections import deque
import platform
import faulthandler; faulthandler.enable();

matplotlib.use('TkAgg')  # Use the TkAgg backend

# Initialize data containers for CPU, memory, network, and disk usage
data_length = 50  # Set the maximum length of data
cpu_data = deque([0] * data_length, maxlen=data_length)
memory_data = deque([0] * data_length, maxlen=data_length)
network_data = deque([0] * data_length, maxlen=data_length)
disk_data = deque([0] * data_length, maxlen=data_length)

# Create a figure with a grid layout
fig = plt.figure(figsize=(10, 8))
fig.suptitle('Real-time Resource Usage', y=0.95)

# Define a grid layout with 5 rows and 1 column
gs = fig.add_gridspec(5, 1, height_ratios=[0.2, 1, 1, 1, 1])

# Add a square for machine information at the top
info_ax = fig.add_subplot(gs[0])
info_ax.axis('off')

# Get machine configuration information, including the processor's name
cpu_info = f'Processor: {platform.processor()}'
memory_info = f'Memory: {psutil.virtual_memory().total / (1024**3):.2f} GB'
disk_info = f'Disk: {psutil.disk_usage("/").total / (1024**3):.2f} GB'

# Display machine configuration information
info_ax.text(0.1, 2, cpu_info, fontsize=10)
info_ax.text(0.1, 2.5, memory_info, fontsize=10)
info_ax.text(0.1, 3, disk_info, fontsize=10)

# Add subplots for CPU, memory, network, and disk usage
cpu_ax = fig.add_subplot(gs[1], sharex=info_ax)
memory_ax = fig.add_subplot(gs[2], sharex=info_ax)
network_ax = fig.add_subplot(gs[3], sharex=info_ax)
disk_ax = fig.add_subplot(gs[4], sharex=info_ax)

# Set up the x-axis data (timestamps)
x_data = list(range(data_length))

# Create lines for CPU, memory, network, and disk usage
cpu_line, = cpu_ax.plot(x_data, cpu_data, label='CPU Usage')
memory_line, = memory_ax.plot(x_data, memory_data, label='Memory Usage')
network_line, = network_ax.plot(x_data, network_data, label='Network I/O')
disk_line, = disk_ax.plot(x_data, disk_data, label='Disk Usage')

# Add legends to each chart
for ax in [cpu_ax, memory_ax, network_ax, disk_ax]:
    ax.legend(loc='upper left')

# Add Y-axis labels to indicate percentages and data units
for ax in [cpu_ax, memory_ax, network_ax, disk_ax]:
    if ax == cpu_ax or ax == memory_ax:
        ax.set_ylabel('Percentage (%)')
    elif ax == network_ax:
        ax.set_ylabel('Bytes')
    elif ax == disk_ax:
        ax.set_ylabel('Percentage (%)')

# Set fixed Y-axis limits for CPU and memory subplots (adjust as needed)
cpu_ax.set_ylim(0, 100)  # Set CPU usage Y-axis limit from 0% to 100%
memory_ax.set_ylim(0, 100)  # Set memory usage Y-axis limit from 0% to 100%

# Function to update the charts with new data
def update(frame):
    # Collect CPU and memory usage data
    cpu_percent = psutil.cpu_percent(interval=1)
    memory_percent = psutil.virtual_memory().percent

    # Collect network data (bytes sent and received)
    network_io = psutil.net_io_counters()
    network_data.append(network_io.bytes_sent + network_io.bytes_recv)

    # Collect disk usage data
    disk_usage = psutil.disk_usage('/')
    disk_data.append(disk_usage.percent)

    # Append CPU and memory data
    cpu_data.append(cpu_percent)
    memory_data.append(memory_percent)

    # Update the chart data
    cpu_line.set_ydata(cpu_data)
    memory_line.set_ydata(memory_data)
    network_line.set_ydata(network_data)
    disk_line.set_ydata(disk_data)

    # Set y-axis limits for all subplots (to update if needed)
    for ax in [cpu_ax, memory_ax, network_ax, disk_ax]:
        ax.relim()
        ax.autoscale_view()

# Create an animation that calls the update function
ani = FuncAnimation(fig, update, blit=False, frames=None, repeat=False)

plt.show()
