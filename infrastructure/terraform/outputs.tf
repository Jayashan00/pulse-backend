output "public_ip" {
  description = "Elastic IP of the Pulse server — point your DNS or open http://<ip>"
  value       = aws_eip.pulse.public_ip
}

output "ssh_command" {
  value = "ssh -i <your-key.pem> ubuntu@${aws_eip.pulse.public_ip}"
}

output "live_urls" {
  value = {
    frontend = "http://${aws_eip.pulse.public_ip}"
    backend  = "http://${aws_eip.pulse.public_ip}/api"
  }
}
