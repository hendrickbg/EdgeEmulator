import psutil
import matplotlib.pyplot as plt
import time
import docker
import faulthandler; faulthandler.enable();
import matplotlib
matplotlib.use('TkAgg')  # Use the TkAgg backend

# Function to get CPU usage percentage for a specific container
def get_container_cpu_usage(container_id):
    try:
        container = client.containers.get(container_id)
        stats = container.stats(stream=False)
        cpu_stats = stats['cpu_stats']
        precpu_stats = stats['precpu_stats']
        cpu_delta = cpu_stats['cpu_usage']['total_usage'] - precpu_stats['cpu_usage']['total_usage']
        system_delta = cpu_stats['system_cpu_usage'] - precpu_stats['system_cpu_usage']
        cpu_percentage = round((cpu_delta / system_delta) * 100.0, 2)
        return cpu_percentage
    except Exception as e:
        print(f"Error getting CPU usage for container {container_id}: {e}")
        return None

# Function to get memory usage percentage for a specific container
def get_container_memory_usage(container_id):
    try:
        container = client.containers.get(container_id)
        stats = container.stats(stream=False)
        memory_stats = stats['memory_stats']
        memory_usage = memory_stats['usage'] / (1024 * 1024)  # Convert to MB
        memory_limit = memory_stats['limit'] / (1024 * 1024)  # Convert to MB
        memory_percentage = round((memory_usage / memory_limit) * 100.0, 2)
        return memory_percentage
    except Exception as e:
        print(f"Error getting memory usage for container {container_id}: {e}")
        return None

# Docker client
client = docker.from_env()

# Initialize lists to store data for plotting
time_data = []
cpu_data_broker = []  # CPU usage for edge_broker
memory_data_broker = []  # Memory usage for edge_broker
cpu_data_iot = []  # CPU usage for edge_iot_smart_dev
memory_data_iot = []  # Memory usage for edge_iot_smart_dev
cpu_data_subscriber = []  # CPU usage for edge_subscriber
memory_data_subscriber = []  # Memory usage for edge_subscriber
cpu_data_data_manager = []  # CPU usage for edge_data_manager
memory_data_data_manager = []  # Memory usage for edge_data_manager

# Set the monitoring duration in seconds
monitoring_duration = 300

# Monitor the containers for the specified duration
start_time = time.time()
container_id_broker = "edge_broker"  # Specify the edge_broker container name or ID
container_id_iot = "edge_iot_smart_dev"  # Specify the edge_iot_smart_dev container name or ID
container_id_subscriber = "edge_subscriber"  # Specify the edge_subscriber container name or ID
container_id_data_manager = "edge_data_manager"  # Specify the edge_data_manager container name or ID

fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 6), sharex=True)
ax1.set_ylabel('Usage (%)')
ax2.set_ylabel('Usage (%)')

while time.time() - start_time <= monitoring_duration:
    cpu_percentage_broker = get_container_cpu_usage(container_id_broker)
    memory_percentage_broker = get_container_memory_usage(container_id_broker)
    cpu_percentage_iot = get_container_cpu_usage(container_id_iot)
    memory_percentage_iot = get_container_memory_usage(container_id_iot)
    cpu_percentage_subscriber = get_container_cpu_usage(container_id_subscriber)
    memory_percentage_subscriber = get_container_memory_usage(container_id_subscriber)
    cpu_percentage_data_manager = get_container_cpu_usage(container_id_data_manager)
    memory_percentage_data_manager = get_container_memory_usage(container_id_data_manager)

    if (
        cpu_percentage_broker is not None
        and memory_percentage_broker is not None
        and cpu_percentage_iot is not None
        and memory_percentage_iot is not None
        and cpu_percentage_subscriber is not None
        and memory_percentage_subscriber is not None
        and cpu_percentage_data_manager is not None
        and memory_percentage_data_manager is not None
    ):
        time_data.append(time.time() - start_time)
        cpu_data_broker.append(cpu_percentage_broker)
        memory_data_broker.append(memory_percentage_broker)
        cpu_data_iot.append(cpu_percentage_iot)
        memory_data_iot.append(memory_percentage_iot)
        cpu_data_subscriber.append(cpu_percentage_subscriber)
        memory_data_subscriber.append(memory_percentage_subscriber)
        cpu_data_data_manager.append(cpu_percentage_data_manager)
        memory_data_data_manager.append(memory_percentage_data_manager)

        # Update the CPU usage chart for each container
        ax1.clear()
        ax1.plot(time_data, cpu_data_broker, label='Edge Broker (%)', color='tab:blue')
        ax1.plot(time_data, cpu_data_iot, label='IoT Dev Sim (%)', linestyle='dashed', color='tab:orange')
        ax1.plot(time_data, cpu_data_subscriber, label='Edge Subscriber (%)', linestyle='dotted', color='tab:green')
        ax1.plot(time_data, cpu_data_data_manager, label='Edge Data Manager (%)', linestyle='dashdot', color='tab:red')
        ax1.set_title('Real-time CPU Usage for Containers')
        ax1.legend(loc='upper left')

        # Update the memory usage chart for each container
        ax2.clear()
        ax2.plot(time_data, memory_data_broker, label='Edge Broker (%)', color='tab:blue')
        ax2.plot(time_data, memory_data_iot, label='IoT Dev Sim (%)', linestyle='dashed', color='tab:orange')
        ax2.plot(time_data, memory_data_subscriber, label='Edge Subscriber (%)', linestyle='dotted', color='tab:green')
        ax2.plot(time_data, memory_data_data_manager, label='Edge Data Manager (%)', linestyle='dashdot', color='tab:gray')
        ax2.set_xlabel('Time (s)')
        ax2.set_title('Real-time Memory Usage for Containers')
        ax2.legend(loc='upper left')

        fig.tight_layout()
        plt.pause(0.01)  # Short pause to update the chart faster

    time.sleep(0.01)  # Shorter sleep duration to update readings faster

# Cleanup
client.close()

# Display the final charts
plt.show()
