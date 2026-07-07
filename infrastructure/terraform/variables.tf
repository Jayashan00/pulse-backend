variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "ap-south-1"
}

variable "instance_type" {
  description = "EC2 instance type (t3.small or larger recommended for Docker builds)"
  type        = string
  default     = "t3.small"
}

variable "key_pair_name" {
  description = "Name of an existing EC2 key pair for SSH access"
  type        = string
}

variable "allowed_ssh_cidr" {
  description = "CIDR allowed to SSH into the instance (use YOUR_IP/32 in production)"
  type        = string
  default     = "0.0.0.0/0"
}

variable "project_name" {
  description = "Project tag prefix"
  type        = string
  default     = "pulse"
}
