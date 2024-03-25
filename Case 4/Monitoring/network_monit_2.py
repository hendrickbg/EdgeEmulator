
#FIXME: Ajustar o plot de rede que não ta certo. Verificar se não ta usando exatamente a mesma leitura pra plotar os dois (input e output)
# AO Que PARECE PELOS LOGS ESTA CERTO. AJUSTAR ESCALAS e tentar com mais edge_dev_Sim

import psutil
import matplotlib.pyplot as plt
import time
import docker
import faulthandler; faulthandler.enable();
import matplotlib
matplotlib.use('Agg')  # Use the TkAgg backend


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

# Function to get network usage for a specific container
def get_container_network_usage(container_id):
    try:
        container = client.containers.get(container_id)
        # print("Container: ", container)
        stats = container.stats(stream=False)
        # print("Stats: ", stats)
        network_stats = stats['networks']
        # print("Network stats: ", network_stats)
        rx_bytes = 0
        tx_bytes = 0
        for network in network_stats.values():
            rx_bytes += network['rx_bytes']
            tx_bytes += network['tx_bytes']
            # print("Rx Bytes: ", rx_bytes)
            # print("Tx Bytes: ", tx_bytes)
        return (rx_bytes, tx_bytes)
    except Exception as e:
        print(f"Error getting network usage for container {container_id}: {e}")
        return (0, 0)

def store_output_data(file_path, output_data_list):
    with open(file_path, "w") as output_file:
        for output_data in output_data_list:
            data = "{}\n".format(output_data)
            output_file.write(data)


# Docker client
client = docker.from_env()

# Initialize lists to store data for plotting
time_data = []
cpu_edge_polygon_node0 = []  # CPU usage for edge_polygon_node0
memory_edge_polygon_node0 = []  # Memory usage for edge_polygon_node0
network_edge_polygon_node0 = []  # Network usage for edge_polygon_node0
cpu_edge_node0 = []  # CPU usage for edge_node0
memory_edge_node0 = []  # Memory usage for edge_node0
network_edge_node0 = []  # Network usage for edge_node0
cpu_device_node1 = []  # CPU usage for device_node1
memory_device_node1 = []  # Memory usage for device_node1
network_device_node1 = []  # Network usage for device_node1

# Set the monitoring duration in seconds
monitoring_duration = 300

# Monitor the containers for the specified duration
start_time = time.time()
container_edge_polygon_node0 = "edge_polygon_node0"  # Specify the edge_polygon_node0 container name or ID
container_node0 = "node0"  # Specify the edge_node0 container name or ID
container_device_node1 = "device_node1"  # Specify the device_node1 container name or ID

# Create a 2x2 grid of subplots with a rectangular aspect ratio
fig, axes = plt.subplots(2, 2, figsize=(14, 8))
ax1, ax2, ax3, ax4 = axes[0, 0], axes[0, 1], axes[1, 0], axes[1, 1]

ax1.set_ylabel('Usage (%)')
ax2.set_ylabel('Usage (%)')
ax3.set_ylabel('Network Input (Bytes)')
ax4.set_ylabel('Network Output (Bytes)')
ax4.set_xlabel('Time (s)')

while time.time() - start_time <= monitoring_duration:
    cpu_percentage_edge_polygon_node0 = get_container_cpu_usage(container_edge_polygon_node0)
    memory_percentage_edge_polygon_node0 = get_container_memory_usage(container_edge_polygon_node0)
    rx_edge_polygon_node0, tx_edge_polygon_node0 = get_container_network_usage(container_edge_polygon_node0)
    network_usage_edge_polygon_node0 = (rx_edge_polygon_node0, tx_edge_polygon_node0)
    cpu_percentage_node0 = get_container_cpu_usage(container_node0)
    memory_percentage_node0 = get_container_memory_usage(container_node0)
    # rx_node0, tx_node0 = get_container_network_usage(container_node0)
    # network_usage_node0 = (rx_node0, tx_node0)
    cpu_percentage_device_node1 = get_container_cpu_usage(container_device_node1)
    memory_percentage_device_node1 = get_container_memory_usage(container_device_node1)
    rx_device_node1, tx_device_node1 = get_container_network_usage(container_device_node1)
    network_usage_device_node1 = (rx_device_node1, tx_device_node1)

    if (
        cpu_percentage_edge_polygon_node0 is not None
        and memory_percentage_edge_polygon_node0 is not None
        and cpu_percentage_node0 is not None
        and memory_percentage_node0 is not None
        and cpu_percentage_device_node1 is not None
        and memory_percentage_device_node1 is not None
    ):
        time_data.append(time.time() - start_time)
        cpu_edge_polygon_node0.append(cpu_percentage_edge_polygon_node0)
        memory_edge_polygon_node0.append(memory_percentage_edge_polygon_node0)
        network_edge_polygon_node0.append(network_usage_edge_polygon_node0)
        cpu_edge_node0.append(cpu_percentage_node0)
        memory_edge_node0.append(memory_percentage_node0)
        # network_edge_node0.append(network_usage_node0)
        cpu_device_node1.append(cpu_percentage_device_node1)
        memory_device_node1.append(memory_percentage_device_node1)
        network_device_node1.append(network_usage_device_node1)

        # Update the CPU usage chart for each container
        ax1.clear()
        ax1.plot(time_data, cpu_edge_polygon_node0, label='CBG (%)', color='tab:blue')
        ax1.plot(time_data, cpu_edge_node0, label='Node0 (%)', linestyle='dashed', color='tab:orange')
        ax1.plot(time_data, cpu_device_node1, label='Device Node1 (%)', linestyle='dotted', color='tab:green')
        ax1.set_title('Real-time CPU Usage for Containers')
        ax1.legend(loc='upper left')

        # Update the memory usage chart for each container
        ax2.clear()
        ax2.plot(time_data, memory_edge_polygon_node0, label='CBG (%)', color='tab:blue')
        ax2.plot(time_data, memory_edge_node0, label='Node0 (%)', linestyle='dashed', color='tab:orange')
        ax2.plot(time_data, memory_device_node1, label='Device Node1 (%)', linestyle='dotted', color='tab:green')
        ax2.set_ylabel('Memory Usage (%)')
        ax2.set_title('Real-time Memory Usage for Containers')
        ax2.legend(loc='upper left')

        # Update the network input chart for each container
        # ax3.clear()
        # ax3.plot(time_data, [rx[0] for rx in network_usage_device_node1], label='CBG (Rx)', color='tab:blue')
        # # ax3.plot(time_data, [rx[0] for rx in network_edge_node0], label='Node0 (Rx)', linestyle='dashed', color='tab:orange')
        # ax3.plot(time_data, [rx[0] for rx in network_device_node1], label='Device Node1 (Rx)', linestyle='dotted', color='tab:green')
        # ax3.set_title('Real-time Network Input (Rx) for Containers')
        # ax3.legend(loc='upper left')

        ax3.clear()
        ax3.plot(time_data, network_edge_polygon_node0, label='CBG', color='tab:blue')
        # ax3.plot(time_data, network_data_iot, label='IoT Dev Sim', linestyle='dashed', color='tab:orange')
        ax3.plot(time_data, network_device_node1, label='Device Node1', linestyle='dotted', color='tab:green')
        # ax3.plot(time_data, network_data_data_manager, label='Edge Data Manager', linestyle='dashdot', color='tab:red')
        ax3.set_title('Real-time Network Usage for Containers')
        ax3.legend(loc='upper left')

        # Update the network output chart for each container
        # ax4.clear()
        # ax4.plot(time_data, [tx[1] for tx in network_usage_device_node1], label='CBG (Tx)', color='tab:blue')
        # # ax4.plot(time_data, [tx[1] for tx in network_edge_node0], label='Node0 (Tx)', linestyle='dashed', color='tab:orange')
        # ax4.plot(time_data, [tx[1] for tx in network_device_node1], label='Device Node1 (Tx)', linestyle='dotted', color='tab:green')
        # ax4.set_title('Real-time Network Output (Tx) for Containers')
        # ax4.legend(loc='upper left')

        store_output_data("Results/cpu_edge_polygon_node.txt", cpu_edge_polygon_node0)
        store_output_data("Results/cpu_edge_node0.txt", cpu_edge_node0)
        store_output_data("Results/cpu_device_node1.txt", cpu_device_node1)

        store_output_data("Results/memory_edge_polygon_node.txt", memory_edge_polygon_node0)
        store_output_data("Results/memory_edge_node0.txt", memory_edge_node0)
        store_output_data("Results/memory_device_node1.txt", memory_device_node1)

        store_output_data("Results/network_edge_polygon_node.txt", network_edge_polygon_node0)
        store_output_data("Results/network_device_node1.txt", network_device_node1)

        fig.tight_layout()
        plt.pause(0.01)  # Short pause to update the chart faster

    time.sleep(0.01)  # Shorter sleep duration to update readings faster

# Cleanup
client.close()

# Display the final charts
# plt.show()
plt.savefig('output_2.png')
